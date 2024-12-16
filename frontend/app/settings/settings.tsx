import { CalendarConnection } from '@/components/CalendarConnection';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-6">
        <CalendarConnection />
        {/* Other settings components */}
      </div>
    </div>
  );
}