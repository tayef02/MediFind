import './globals.css';

export const metadata = {
  title: 'MediFind',
  description: 'Find medicine in Sylhet pharmacies',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
