import Link from "next/link";
export const metadata = {
    title:"Service",
    description: "This is my app",
}

export default function Service() {
  return (
    <>
    <div>service</div>
    <Link href="/service/web-devs">Web Devs</Link>
    </>
  )
}


 