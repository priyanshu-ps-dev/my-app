import Link from "next/link";
import Componentspage from "../_components/page";

export const metadata = {
  title: "Home",
};

export default function Home() {
  console.log("Blog Page")
  return (
    <>
      <h1>Heloo </h1>
      <Componentspage></Componentspage>
      <Link href="/Blogs">Blogs</Link>
      <br />
      <Link href="/service">Service</Link>

      <br></br>
      <Link href="/about">About</Link>
    </>
  );
}
