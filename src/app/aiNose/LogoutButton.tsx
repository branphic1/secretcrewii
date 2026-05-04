"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/aiNose/gate", { method: "DELETE" });
    window.location.href = "/aiNose/gate";
  }
  return (
    <button onClick={logout} className="text-slate-500 hover:text-slate-700 text-sm">
      로그아웃
    </button>
  );
}
