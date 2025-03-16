import Link from 'next/link';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1>Welcome to Your App</h1>
        <nav>
          <ul>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/personal-details">Personal Details</Link></li>
            <li><Link href="/work-times">Work Times</Link></li>
            <li><Link href="/tasks">Tasks</Link></li>
            <li><Link href="/energy-patterns">Energy Patterns</Link></li>
            <li><Link href="/priorities">Priorities</Link></li>
            <li><Link href="/structure-preference">Structure Preference</Link></li>
            <li><Link href="/subcategory-preference">Subcategory Preference</Link></li>
            <li><Link href="/timebox-preference">Layout Preference</Link></li>
            <li><Link href="/dashboard">Dashboard</Link></li>
          </ul>
        </nav>
      </main>
    </div>
  );
}