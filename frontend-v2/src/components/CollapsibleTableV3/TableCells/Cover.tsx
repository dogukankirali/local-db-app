import { TableCell } from "@mui/material";
import { useState } from "react";

export default function Cover(props: { cover: string; alt?: string }) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <TableCell
      className="p-4 border-b border-slate-200 py-5 relative"
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      <img
        src={props.cover}
        alt={props.alt || "Cover"}
        className="w-16 h-16 object-cover rounded"
      />
      {showPopup && (
        <div
          className={`absolute z-50 left-20 -top-10 bg-white p-2 rounded-lg shadow-xl
          ${
            showPopup
              ? "animate__animated animate__fadeIn"
              : "animate__animated animate__fadeOut"
          }`}
        >
          <img
            src={props.cover}
            alt={props.alt || "Cover"}
            className="w-48 h-48 object-cover rounded"
          />
        </div>
      )}
    </TableCell>
  );
}
