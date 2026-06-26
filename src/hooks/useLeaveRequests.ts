import { useState, useEffect } from "react";
import { LeaveRequest } from "../types";
import { db, LeaveRequestDB } from "../utils/database";
import { authStorage } from "../utils/adminAuth";
import { invalidateDashboardStatsCache } from "./useDashboardStats";

interface UseLeaveRequestsOptions {
  autoLoad?: boolean;
}

// Transform database record to frontend type
export const transformDBToFrontend = (
  dbRecord: LeaveRequestDB,
): LeaveRequest => ({
  id: dbRecord.id,
  nama: dbRecord.nama,
  nip: dbRecord.nip,
  pangkatGolongan: dbRecord.pangkat_golongan,
  jabatan: dbRecord.jabatan,
  kecamatan: dbRecord.koordinator_wilayah,
  jenjang: dbRecord.jenjang || "",
  unitKerja: dbRecord.sekolah,
  jenisCuti: dbRecord.jenis_cuti,
  tanggalMulai: dbRecord.tanggal_mulai,
  tanggalSelesai: dbRecord.tanggal_selesai,
  alasanCuti: dbRecord.alasan_cuti,
  files: (() => {
    const raw = dbRecord.files;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })(),
  status: dbRecord.status,
  rejectionReason: dbRecord.rejection_reason || "",
  submissionDate: dbRecord.submission_date,
  driveLink: dbRecord.drive_link || undefined,
  finalLetterUrl: dbRecord.final_letter_url || undefined,
  coordinatorApprovalDate: dbRecord.coordinator_approval_date || undefined,
  adminApprovalDate: dbRecord.admin_approval_date || undefined,
  isRevised: dbRecord.is_revised || false,
  originalRejectionReason: dbRecord.original_rejection_reason || undefined,
});

// Transform frontend type to database record
const transformFrontendToDB = (
  frontendRecord: Omit<LeaveRequest, "id" | "submissionDate">,
): Omit<LeaveRequestDB, "id" | "created_at" | "updated_at"> => ({
  nama: frontendRecord.nama,
  nip: frontendRecord.nip,
  pangkat_golongan: frontendRecord.pangkatGolongan,
  jabatan: frontendRecord.jabatan,
  koordinator_wilayah: frontendRecord.kecamatan,
  jenjang: frontendRecord.jenjang,
  sekolah: frontendRecord.unitKerja,
  jenis_cuti: frontendRecord.jenisCuti,
  tanggal_mulai: frontendRecord.tanggalMulai,
  tanggal_selesai: frontendRecord.tanggalSelesai,
  alasan_cuti: frontendRecord.alasanCuti,
  files: JSON.stringify(frontendRecord.files || []),
  status: frontendRecord.status,
  rejection_reason: frontendRecord.rejectionReason || "",
  submission_date: new Date().toISOString().split("T")[0],
  drive_link: frontendRecord.driveLink || undefined,
  final_letter_url: frontendRecord.finalLetterUrl || undefined,
  coordinator_approval_date:
    frontendRecord.coordinatorApprovalDate || undefined,
  admin_approval_date: frontendRecord.adminApprovalDate || undefined,
  is_revised: frontendRecord.isRevised || false,
  original_rejection_reason:
    frontendRecord.originalRejectionReason || undefined,
});

export const useLeaveRequests = ({
  autoLoad = false,
}: UseLeaveRequestsOptions = {}) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  // Load all leave requests
  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const dbRecords = await db.getAllLeaveRequests();
      const transformedRecords = dbRecords.map(transformDBToFrontend);
      setLeaveRequests(transformedRecords);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load leave requests";
      setError(errorMessage);
      console.error("Error loading leave requests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Create new leave request
  const createLeaveRequest = async (
    request: Omit<
      LeaveRequest,
      "id" | "status" | "rejectionReason" | "submissionDate"
    >,
  ) => {
    try {
      setError(null);
      const dbRecord = transformFrontendToDB({
        ...request,
        status: "pending",
        rejectionReason: "",
      });
      const createdRecord = await db.createLeaveRequest(dbRecord);

      if (createdRecord) {
        const transformedRecord = transformDBToFrontend(createdRecord);
        invalidateDashboardStatsCache();
        setLeaveRequests((prev) => [...prev, transformedRecord]);
        return transformedRecord;
      }
      throw new Error("Failed to create leave request");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create leave request";
      setError(errorMessage);
      console.error("Error creating leave request:", err);
      return null;
    }
  };

  // Update leave request
  const updateLeaveRequest = async (
    id: string,
    updates: Partial<LeaveRequest>,
  ) => {
    try {
      setError(null);
      const dbUpdates: Partial<LeaveRequestDB> = {};

      if (updates.nama) dbUpdates.nama = updates.nama;
      if (updates.nip) dbUpdates.nip = updates.nip;
      if (updates.pangkatGolongan)
        dbUpdates.pangkat_golongan = updates.pangkatGolongan;
      if (updates.jabatan) dbUpdates.jabatan = updates.jabatan;
      if (updates.kecamatan) dbUpdates.koordinator_wilayah = updates.kecamatan;
      if (updates.jenjang) dbUpdates.jenjang = updates.jenjang;
      if (updates.unitKerja) dbUpdates.sekolah = updates.unitKerja;
      if (updates.jenisCuti) dbUpdates.jenis_cuti = updates.jenisCuti;
      if (updates.tanggalMulai) dbUpdates.tanggal_mulai = updates.tanggalMulai;
      if (updates.tanggalSelesai)
        dbUpdates.tanggal_selesai = updates.tanggalSelesai;
      if (updates.alasanCuti) dbUpdates.alasan_cuti = updates.alasanCuti;
      if (updates.files) dbUpdates.files = JSON.stringify(updates.files);
      if (updates.status) {
        dbUpdates.status = updates.status;
        // Auto-set approval dates when status changes
        if (updates.status === "approved_coordinator") {
          dbUpdates.coordinator_approval_date = new Date()
            .toISOString()
            .split("T")[0];
        } else if (updates.status === "approved_admin") {
          dbUpdates.admin_approval_date = new Date()
            .toISOString()
            .split("T")[0];
        } else if (updates.status === "pending") {
          // Reset approval dates when request goes back to pending (revision/correction)
          dbUpdates.coordinator_approval_date = null as any;
          dbUpdates.admin_approval_date = null as any;
        }
      }
      if (updates.rejectionReason !== undefined)
        dbUpdates.rejection_reason = updates.rejectionReason;
      if (updates.driveLink !== undefined)
        dbUpdates.drive_link = updates.driveLink;
      if (updates.finalLetterUrl !== undefined)
        dbUpdates.final_letter_url = updates.finalLetterUrl;
      if (updates.coordinatorApprovalDate !== undefined)
        dbUpdates.coordinator_approval_date = updates.coordinatorApprovalDate;
      if (updates.adminApprovalDate !== undefined)
        dbUpdates.admin_approval_date = updates.adminApprovalDate;
      if (updates.isRevised !== undefined)
        dbUpdates.is_revised = updates.isRevised;
      if (updates.originalRejectionReason !== undefined)
        dbUpdates.original_rejection_reason = updates.originalRejectionReason;

      const updatedRecord = await db.updateLeaveRequest(id, dbUpdates);
      if (updatedRecord) {
        const transformedRecord = transformDBToFrontend(updatedRecord);
        invalidateDashboardStatsCache();
        setLeaveRequests((prev) =>
          prev.map((req) => (req.id === id ? transformedRecord : req)),
        );
        return transformedRecord;
      }
      throw new Error("Failed to update leave request");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update leave request";
      setError(errorMessage);
      console.error("Error updating leave request:", err);
      return null;
    }
  };

  // Get leave requests by NIP (auto-fallback: admin session → public RPC)
  const getLeaveRequestsByNIP = async (
    nip: string,
  ): Promise<LeaveRequest[]> => {
    try {
      setError(null);
      // Gunakan public RPC jika tidak ada session admin
      const sessionToken = authStorage.getSessionToken();
      if (!sessionToken) {
        const dbRecords = await db.checkLeaveStatusByNIP(nip);
        return dbRecords.map(transformDBToFrontend);
      }
      const dbRecords = await db.getLeaveRequestsByNIP(nip);
      return dbRecords.map(transformDBToFrontend);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch leave requests by NIP";
      setError(errorMessage);
      console.error("Error fetching leave requests by NIP:", err);
      return [];
    }
  };

  // Public: check leave status by NIP (no session required)
  const checkLeaveStatusByNIP = async (
    nip: string,
  ): Promise<LeaveRequest[]> => {
    try {
      setError(null);
      const dbRecords = await db.checkLeaveStatusByNIP(nip);
      return dbRecords.map(transformDBToFrontend);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check leave status";
      setError(errorMessage);
      console.error("Error checking leave status by NIP:", err);
      return [];
    }
  };

  // Delete leave request
  const deleteLeaveRequest = async (id: string) => {
    try {
      setError(null);
      const success = await db.deleteLeaveRequest(id);
      if (success) {
        invalidateDashboardStatsCache();
        setLeaveRequests((prev) => prev.filter((req) => req.id !== id));
        return true;
      }
      throw new Error("Failed to delete leave request");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete leave request";
      setError(errorMessage);
      console.error("Error deleting leave request:", err);
      return false;
    }
  };

  // Load the full archive only on screens that explicitly need it.
  useEffect(() => {
    if (autoLoad) {
      loadLeaveRequests();
    } else {
      setLoading(false);
    }
  }, [autoLoad]);

  return {
    leaveRequests,
    loading,
    error,
    loadLeaveRequests,
    createLeaveRequest,
    updateLeaveRequest,
    getLeaveRequestsByNIP,
    checkLeaveStatusByNIP,
    deleteLeaveRequest,
  };
};
