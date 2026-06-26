import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import "./lib/chart-setup";
import "./styles/v2.css";
import V2Footer from "./components/v2/V2Footer";
import V2Header from "./components/v2/V2Header";
import V2Dashboard from "./components/v2/V2Dashboard";
import V2Modal from "./components/v2/V2Modal";
import PengajuanCutiPage from "./components/v2/PengajuanCutiPage";
import StatusPengajuanPage from "./components/v2/StatusPengajuanPage";
import DinasPage from "./components/v2/DinasPage";
import TataCaraPage from "./components/v2/TataCaraPage";
import { LeaveRequest, UserRole } from "./types";
import { useLeaveRequests } from "./hooks/useLeaveRequests";

const AppV2Routes: React.FC = () => {
  const navigate = useNavigate();

  const [currentRole, setCurrentRole] = useState<UserRole>("user");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    message: string;
    type: "info" | "success" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });
  const [nipFilter, setNipFilter] = useState("");
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(
    null,
  );

  const {
    leaveRequests,
    loading: _loading,
    error: _dataError,
    createLeaveRequest,
    updateLeaveRequest,
    getLeaveRequestsByNIP,
    checkLeaveStatusByNIP,
  } = useLeaveRequests({ autoLoad: false });

  const showModal = (
    message: string,
    type: "info" | "success" | "error" = "info",
  ) => {
    setModal({ isOpen: true, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, message: "", type: "info" });
  };

  const handleUpdateLeaveRequest = async (
    id: string,
    updates: Partial<LeaveRequest>,
  ) => {
    const updatedRequest = await updateLeaveRequest(id, updates);
    return updatedRequest !== null;
  };

  const approveRequest = async (id: string, role: "coordinator" | "admin") => {
    const request = leaveRequests.find((req) => req.id === id);
    const newStatus =
      role === "coordinator" ? "approved_coordinator" : "approved_admin";
    const success = await handleUpdateLeaveRequest(id, { status: newStatus });

    if (success) {
      const roleText =
        role === "coordinator" ? "Koordinator Wilayah" : "Dinas Pendidikan";
      showModal(
        request
          ? `Pengajuan cuti dari ${request.nama} telah disetujui oleh ${roleText}.`
          : `Pengajuan cuti telah disetujui oleh ${roleText}.`,
        "success",
      );
      return true;
    } else {
      showModal("Gagal menyetujui pengajuan. Silakan coba kembali.", "error");
      return false;
    }
  };

  const rejectRequest = async (
    id: string,
    role: "coordinator" | "admin",
    reason: string,
  ) => {
    const request = leaveRequests.find((req) => req.id === id);
    const success = await handleUpdateLeaveRequest(id, {
      status: "rejected",
      rejectionReason: reason,
    });

    if (success) {
      const roleText =
        role === "coordinator" ? "Koordinator Wilayah" : "Admin Dinas";
      showModal(
        request
          ? `Pengajuan cuti dari ${request.nama} telah ditolak oleh ${roleText} dengan alasan: "${reason}"`
          : `Pengajuan cuti telah ditolak oleh ${roleText} dengan alasan: "${reason}"`,
        "error",
      );
      return true;
    } else {
      showModal("Gagal menolak pengajuan. Silakan coba kembali.", "error");
      return false;
    }
  };

  const addLeaveRequest = async (
    request: Omit<
      LeaveRequest,
      "id" | "status" | "rejectionReason" | "submissionDate"
    >,
  ) => {
    // Semua pengajuan (baru maupun revisi) dibuat via createLeaveRequest (public RPC, tanpa session)
    // Admin hanya bertugas approve/reject, bukan mengajukan cuti
    const newRequest = await createLeaveRequest(request);
    if (newRequest) {
      const msg = editingRequest
        ? "Pengajuan cuti telah diperbaiki dan diajukan kembali. Pengajuan akan diproses secara berjenjang."
        : "Pengajuan cuti telah disimpan. Pengajuan akan diproses secara berjenjang.";
      showModal(msg, "success");
      setEditingRequest(null);
      navigate("/status");
    } else {
      showModal(
        "Gagal menyimpan pengajuan cuti. Silakan coba kembali.",
        "error",
      );
    }
  };

  const editRejectedRequest = (request: LeaveRequest) => {
    setEditingRequest(request);
    navigate("/pengajuan");
  };

  return (
    <>
      <V2Header />
      <Routes>
        <Route path="/" element={<V2Dashboard />} />
        <Route
          path="/pengajuan"
          element={
            <PengajuanCutiPage
              onSubmit={addLeaveRequest}
              showModal={(msg: string) => showModal(msg, "info")}
              editingRequest={editingRequest}
              getLeaveRequestsByNIP={getLeaveRequestsByNIP}
            />
          }
        />
        <Route
          path="/status"
          element={
            <StatusPengajuanPage
              leaveRequests={leaveRequests}
              nipFilter={nipFilter}
              setNipFilter={setNipFilter}
              onEditRequest={editRejectedRequest}
              checkLeaveStatusByNIP={checkLeaveStatusByNIP}
            />
          }
        />
        <Route
          path="/dinas"
          element={
            <DinasPage
              leaveRequests={leaveRequests}
              currentRole={currentRole}
              setCurrentRole={setCurrentRole}
              isAdminLoggedIn={isAdminLoggedIn}
              setIsAdminLoggedIn={setIsAdminLoggedIn}
              onApprove={approveRequest}
              onReject={rejectRequest}
              onUpdate={handleUpdateLeaveRequest}
              showModal={(msg: string) => showModal(msg, "info")}
            />
          }
        />
        <Route path="/tatacara" element={<TataCaraPage />} />
      </Routes>
      <V2Footer />
      <V2Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        message={modal.message}
        type={modal.type}
      />
    </>
  );
};

const AppV2: React.FC = () => (
  <BrowserRouter>
    <div className="ui-v2 flex min-h-screen flex-col">
      <AppV2Routes />
    </div>
  </BrowserRouter>
);

export default AppV2;
