import type { Metadata } from "next";
import BookDetail from "../../../components/book/BookDetail";

export const metadata: Metadata = { title: "Kitap" };

export default function BookDetailPage() {
  return <BookDetail />;
}
