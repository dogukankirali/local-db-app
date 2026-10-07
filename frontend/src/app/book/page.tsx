import type { Metadata } from "next";
import BookLibrary from "../../components/book/BookLibrary";

export const metadata: Metadata = { title: "Kitaplar" };

export default function BookPage() {
  return <BookLibrary />;
}
