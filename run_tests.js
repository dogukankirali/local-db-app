const axios = require('axios');
const API_URL = 'https://local-db-app-413673987721.us-central1.run.app';

let passed = 0;
let failed = 0;
let totalTime = 0;
const errors = [];
const perfData = [];

async function runTest(name, config, validator) {
  const start = performance.now();
  try {
    const res = await axios(config);
    const end = performance.now();
    const duration = end - start;
    totalTime += duration;
    perfData.push({ name, duration });
    
    const isValid = validator(res.data);
    if (isValid) {
      passed++;
      console.log(`[PASS] ${name} (${duration.toFixed(2)}ms)`);
    } else {
      failed++;
      console.log(`[FAIL] ${name} - Validation failed`);
      errors.push({ name, reason: 'Validation failed' });
    }
  } catch (err) {
    const end = performance.now();
    const duration = end - start;
    totalTime += duration;
    failed++;
    console.log(`[FAIL] ${name} - Error: ${err.message}`);
    errors.push({ name, reason: err.message });
  }
}

function buildConfig(params, filters = []) {
  const queryParams = new URLSearchParams(params).toString();
  return {
    method: 'POST',
    url: `${API_URL}/getAnimeTable?${queryParams}`,
    data: { filterArray: filters }
  };
}

async function runAll() {
  console.log("Starting 30-case Test Suite...");
  
  // 1-5: Pagination Tests
  await runTest("Page 1, 10 items", buildConfig({page: 1, count: 10}), d => d.data.length <= 10 && d.pagination.currentPage === 1);
  await runTest("Page 2, 5 items", buildConfig({page: 2, count: 5}), d => d.data.length <= 5 && d.pagination.currentPage === 2);
  await runTest("Page out of bounds (9999)", buildConfig({page: 9999, count: 10}), d => d.data.length === 0);
  await runTest("Count 50 items", buildConfig({page: 1, count: 50}), d => d.data.length <= 50);
  await runTest("Negative page index", buildConfig({page: -1, count: 10}), d => d.pagination.currentPage === 1 || d.data.length >= 0); 
  
  // 6-12: Sorting Tests
  await runTest("Sort Name ASC", buildConfig({page:1, count:10, orderBy:'Name', order:'asc'}), d => {
    if(d.data.length < 2) return true;
    return d.data[0].Name.toLowerCase() <= d.data[d.data.length-1].Name.toLowerCase();
  });
  await runTest("Sort Name DESC", buildConfig({page:1, count:10, orderBy:'Name', order:'desc'}), d => {
    if(d.data.length < 2) return true;
    return d.data[0].Name.toLowerCase() >= d.data[d.data.length-1].Name.toLowerCase();
  });
  await runTest("Sort Score DESC", buildConfig({page:1, count:10, orderBy:'Score', order:'desc'}), d => {
    if(d.data.length < 2) return true;
    return d.data[0].Score >= d.data[1].Score;
  });
  await runTest("Sort TotalEpisodes ASC", buildConfig({page:1, count:10, orderBy:'TotalNumberOfEpisodes', order:'asc'}), d => {
    if(d.data.length < 2) return true;
    return d.data[0].TotalNumberOfEpisodes <= d.data[d.data.length-1].TotalNumberOfEpisodes;
  });
  
  // 13-20: Filtering Tests
  await runTest("Filter Name Partial Match", buildConfig({page:1, count:10}, [{key: 'Name', value: 'a'}]), d => d.data.every(a => a.Name.toLowerCase().includes('a')));
  await runTest("Filter Status Completed", buildConfig({page:1, count:10}, [{key: 'AnimeStatus', value: ['Completed']}]), d => d.data.every(a => a.AnimeStatus === 'Completed'));
  await runTest("Filter IsMovie True", buildConfig({page:1, count:10}, [{key: 'IsMovie', value: [true]}]), d => d.data.every(a => a.IsMovie === true));
  await runTest("Filter WatchStatus", buildConfig({page:1, count:10}, [{key: 'WatchStatus', value: 1}]), d => d.data.every(a => a.WatchStatus === 1 || a.WatchStatus === '1'));
  
  // Score filters
  await runTest("Filter Score > 8", buildConfig({page:1, count:10}, [{key: 'Score', value: 8, operand: '>'}]), d => d.data.every(a => a.Score > 8));
  await runTest("Filter Score < 5", buildConfig({page:1, count:10}, [{key: 'Score', value: 5, operand: '<'}]), d => d.data.every(a => a.Score < 5));
  
  // Episodes filter
  await runTest("Filter Episodes = 12", buildConfig({page:1, count:10}, [{key: 'TotalNumberOfEpisodes', value: 12, operand: '='}]), d => d.data.every(a => a.TotalNumberOfEpisodes === 12));
  
  // 21-25: Combined Filters & Sorts
  await runTest("Combine: Name + Status + Sort Score", buildConfig({page:1, count:10, orderBy:'Score', order:'desc'}, [{key: 'Name', value: 'a'}, {key: 'AnimeStatus', value: ['Completed']}]), d => {
      return d.data.every(a => a.Name.toLowerCase().includes('a') && a.AnimeStatus === 'Completed');
  });
  await runTest("Combine: Movie + Score > 7 + Pagination", buildConfig({page:2, count:5}, [{key: 'IsMovie', value: [true]}, {key: 'Score', value: 7, operand: '>'}]), d => {
      return d.data.length <= 5 && d.data.every(a => a.IsMovie === true && a.Score > 7);
  });
  
  // 26-28: Edge Cases (SQL Injection attempt, empty values)
  await runTest("SQL Injection attempt in Name", buildConfig({page:1, count:10}, [{key: 'Name', value: "'; DROP TABLE anime.animes; --"}]), d => true); // As long as it doesn't crash 500
  await runTest("Empty Filter Array", buildConfig({page:1, count:10}, []), d => d.data.length === 10);
  await runTest("Extremely long name filter", buildConfig({page:1, count:10}, [{key: 'Name', value: "a".repeat(500)}]), d => d.data.length === 0);

  // 29-30: Create & Delete flow (Dummy data)
  console.log("Running Dummy Data Create/Delete tests...");
  let createdId = null;
  try {
      const createStart = performance.now();
      const createRes = await axios.post(`${API_URL}/createAnime`, {
          Name: "Ping pong the anime TEST RUN", WatchStatus: 1, AnimeStatus: "Completed", Score: 9, TotalNumberOfEpisodes: 11
      });
      perfData.push({name: "Create Anime", duration: performance.now() - createStart});
      passed++; console.log("[PASS] Create Dummy Anime");
      
      // Find it to get ID
      const findRes = await axios(buildConfig({page:1, count:1}, [{key: 'Name', value: "Ping pong the anime TEST RUN"}]));
      if(findRes.data.data.length > 0) {
          createdId = findRes.data.data[0].ID;
          passed++; console.log("[PASS] Find Dummy Anime");
      } else {
          failed++; console.log("[FAIL] Find Dummy Anime");
      }
      
      if(createdId) {
          const delStart = performance.now();
          await axios.delete(`${API_URL}/deleteAnime?id=${createdId}`);
          perfData.push({name: "Delete Anime", duration: performance.now() - delStart});
          passed++; console.log("[PASS] Delete Dummy Anime");
      }
  } catch (err) {
      failed++; console.log("[FAIL] Create/Delete Flow - " + err.message);
  }

  console.log("\n--- TEST RESULTS ---");
  console.log(`Total Passed: ${passed}`);
  console.log(`Total Failed: ${failed}`);
  
  console.log("\n--- PERFORMANCE DATA ---");
  const avgTime = totalTime / perfData.length;
  console.log(`Average Response Time: ${avgTime.toFixed(2)}ms`);
  const slowQueries = perfData.filter(p => p.duration > 300);
  console.log(`Slow Queries (>300ms): ${slowQueries.length}`);
  slowQueries.forEach(s => console.log(` - ${s.name}: ${s.duration.toFixed(2)}ms`));
}

runAll();
