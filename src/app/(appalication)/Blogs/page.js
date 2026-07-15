import Link from "next/link";



export const metadata = {
  title:"Blogs",
  description: "This is my app",
}

export default function Blog() {
  return (
    <>
      <h1>Blogs</h1>
      <Link href="/Blogs/Blog1">Blog1</Link>
      <p>Blog 2</p>
      
    </>
  );
}
