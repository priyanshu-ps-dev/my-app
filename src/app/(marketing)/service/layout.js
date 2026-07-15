export const metadata = {
    title:{
      template:`%s | My App`,
    }
}

export default function Layout({ children }) {
  return (
    <html>
      <header class="header">Header</header>
      <body>{children}</body>
    </html>
  );
}
