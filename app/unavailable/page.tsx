export default function UnavailablePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-3xl font-extrabold mb-4">Unsupported Region</h1>
      <p className="text-base mb-8">
        If you see this message, it means TinyMind is not supported in your
        region. Please use a VPN or proxy to access TinyMind.
      </p>
    </div>
  );
}
