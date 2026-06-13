# Fitur Hitung/Potong Kuota Cuti Tahunan - Tidak Menghitung Hari Minggu

## ✅ Fitur Baru: Sunday Exclusion untuk ASN/Guru (6 Hari Kerja)

### **Apa yang Ditambahkan:**
1. **otomatis tidak menghitung hari Minggu** dalam kuota cuti tahunan
2. **Perhitungan otomatis** untuk ASN/Guru dengan 6 hari kerja (Senin-Sabtu)
3. **Hari Sabtu tetap dihitung** sebagai hari kerja

### **Cara Kerja:**

#### **Contoh Skenario:**
**Cuti: 6-9 Januari 2025 (Jumat-Senin)**
- **Tanggal**: 6 Jan (Jumat), 7 Jan (Sabtu), 8 Jan (Minggu), 9 Jan (Senin)
- **Hasil**: 4 hari total, 3 hari cuti terpakai (Minggu tidak dihitung)
- **Hari kerja**: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu (6 hari)

### **Perubahan Kode:**

#### **1. Fungsi `calculateLeaveDays`**
```typescript
// Untuk ASN/guru: 6 hari kerja (Senin-Sabtu), hari Minggu dikecualikan
const calculateLeaveDays = (startDate: string, endDate: string, excludeSunday: boolean = true): number => {
  // Hanya hari Minggu (0) yang dikecualikan
  // Hari kerja: Senin (1) hingga Sabtu (6)
}
```

#### **2. Fungsi Validasi**
- `getAnnualLeaveStats()` - Parameter `excludeSunday: true`
- `validateAnnualLeaveLimit()` - Parameter `excludeSunday: true`
- `validateLeaveRequest()` - Parameter `excludeSunday: true`

#### **3. Logika Perhitungan**
```typescript
// Hanya hari Minggu yang dikecualikan
if (dayOfWeek !== 0) { // 0 = Sunday
  workingDays++;
}
```

### **Testing:**
1. Buka Form Pengajuan Cuti
2. Pilih "Cuti Tahunan"
3. Isi tanggal yang mencakup hari Minggu
4. Lihat perhitungan otomatis yang tidak menghitung Minggu

### **Benefit:**
- ✅ **Sesuai Regulasi**: ASN/Guru 6 hari kerja (Minggu libur)
- ✅ **Efisien**: Menghemat kuota cuti untuk hari Minggu
- ✅ **Otomatis**: Tidak perlu setting manual
- ✅ **Akurat**: Perhitungan yang tepat sesuai regulasi ASN
