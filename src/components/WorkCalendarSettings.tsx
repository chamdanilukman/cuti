import React, { useMemo, useState } from 'react';
import { Calendar, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { AdminUser } from '../types';
import { db } from '../utils/database';
import { CalendarDayType, WorkCalendarDay, getDefaultCalendarDays } from '../utils/workCalendar';
import { useWorkCalendar } from '../hooks/useWorkCalendar';

interface WorkCalendarSettingsProps {
  user: AdminUser;
  showModal: (message: string) => void;
}

const currentYear = new Date().getFullYear();

const WorkCalendarSettings: React.FC<WorkCalendarSettingsProps> = ({ user, showModal }) => {
  const [year, setYear] = useState(currentYear);
  const [date, setDate] = useState(`${currentYear}-01-01`);
  const [type, setType] = useState<CalendarDayType>('national_holiday');
  const [description, setDescription] = useState('');
  const { days, loading, error, reload } = useWorkCalendar(year);

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days]
  );

  const handleSave = async () => {
    if (!date || !description.trim()) {
      showModal('Tanggal dan keterangan kalender wajib diisi.');
      return;
    }

    try {
      await db.upsertWorkCalendarDay({
        adminUserId: user.id,
        date,
        type,
        description: description.trim()
      });
      setDescription('');
      await reload();
      showModal('Kalender kerja berhasil disimpan.');
    } catch (err) {
      showModal(err instanceof Error ? err.message : 'Gagal menyimpan kalender kerja.');
    }
  };

  const handleDelete = async (day: WorkCalendarDay) => {
    try {
      await db.deleteWorkCalendarDay(user.id, day.date);
      await reload();
      showModal('Tanggal kalender kerja berhasil dihapus.');
    } catch (err) {
      showModal(err instanceof Error ? err.message : 'Gagal menghapus kalender kerja.');
    }
  };

  const handleCopyDefaultYear = async () => {
    const defaults = getDefaultCalendarDays().filter((day) => day.date.startsWith(`${year}-`));

    if (defaults.length === 0) {
      showModal(`Belum ada kalender bawaan untuk tahun ${year}. Tambahkan tanggal secara manual.`);
      return;
    }

    try {
      await Promise.all(defaults.map((day) => db.upsertWorkCalendarDay({
        adminUserId: user.id,
        date: day.date,
        type: day.type,
        description: day.description
      })));
      await reload();
      showModal(`Kalender bawaan tahun ${year} berhasil disalin ke database.`);
    } catch (err) {
      showModal(err instanceof Error ? err.message : 'Gagal menyalin kalender bawaan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-violet-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Pengaturan Kalender Kerja</h3>
              <p className="text-sm text-slate-600">Kelola libur nasional dan cuti bersama yang tidak mengurangi kuota cuti tahunan.</p>
            </div>
          </div>
          <button
            onClick={reload}
            className="flex items-center justify-center space-x-2 px-3 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}. Aplikasi tetap memakai kalender bawaan jika data database belum tersedia.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tahun</label>
            <input
              type="number"
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                setDate(`${nextYear}-01-01`);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              min="2024"
              max="2100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Jenis</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as CalendarDayType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            >
              <option value="national_holiday">Libur Nasional</option>
              <option value="joint_leave">Cuti Bersama</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Keterangan</label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              placeholder="Contoh: Hari Raya Natal"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSave}
              className="flex w-full items-center justify-center space-x-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700"
            >
              <Save className="w-4 h-4" />
              <span>Simpan</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleCopyDefaultYear}
          className="mt-4 flex items-center space-x-2 px-4 py-2 border border-violet-200 text-violet-700 rounded-xl hover:bg-violet-50"
        >
          <Plus className="w-4 h-4" />
          <span>Salin Kalender Bawaan Tahun Ini</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h4 className="font-semibold text-slate-900">Daftar Kalender Tahun {year}</h4>
        </div>
        {loading ? (
          <div className="p-6 text-slate-600">Memuat kalender kerja...</div>
        ) : sortedDays.length === 0 ? (
          <div className="p-6 text-slate-600">Belum ada data kalender untuk tahun ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Tanggal</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Jenis</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Keterangan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedDays.map((day) => (
                  <tr key={day.date} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-900">{day.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {day.type === 'national_holiday' ? 'Libur Nasional' : 'Cuti Bersama'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{day.description}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(day)}
                        className="p-1 text-rose-600 hover:text-rose-800"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkCalendarSettings;
