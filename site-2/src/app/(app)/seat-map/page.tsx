export const runtime = "edge";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InteractiveGrid from "@/components/SeatMap/InteractiveGrid";
import { getSeatStatus, daysUntil, sortSeats } from "@/lib/utils";
import { getActiveLibraryId } from "@/lib/getActiveLibrary";

export default async function SeatMapPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("library_ids")
    .eq("user_id", user.id)
    .single();

  const libraryId = await getActiveLibraryId(user.id, staff?.library_ids || []);
  if (!libraryId) return <div>No library assigned.</div>;

  // Fetch seats with students AND per-shift occupancy
  const { data: seatData, error } = await supabase
    .from("seats")
    .select(
      `
      id,
      seat_number,
      gender,
      students (
        id,
        name,
        phone,
        father_name,
        address,
        end_date,
        shift_display,
        selected_shifts,
        locker_id,
        payment_status,
        total_fee,
        amount_paid,
        discount_amount,
        plan_months
      )
    `,
    )
    .eq("library_id", libraryId)
    .eq("is_active", true);

  if (error) return <div>Error loading seats.</div>;

  // Fetch library shifts config (to know which shifts this library has)
  const [{ data: shifts }, { data: comboPlans }] = await Promise.all([
    supabase.from("shifts").select("code, name, start_time, end_time").eq("library_id", libraryId),
    supabase
      .from("combo_plans")
      .select("*")
      .eq("library_id", libraryId)
      .order("months"),
  ]);

  const shiftCodes = shifts?.map((s) => s.code) || ["M", "A", "E", "N"];

  // Natural sort seats
  const sortedSeatData = sortSeats(seatData || []);

  const seatsWithStatus = sortedSeatData.map((seat) => {
    const students = (seat as any).students || [];
    const today = new Date();
    const activeStudents = students.filter(
      (s: any) => new Date(s.end_date) >= today,
    );
    const expiredStudents = students.filter(
      (s: any) => new Date(s.end_date) < today,
    );

    let earliestExpiry = null;
    if (activeStudents.length > 0) {
      earliestExpiry = Math.min(
        ...activeStudents.map((s: any) => new Date(s.end_date).getTime()),
      );
    }

    const daysLeft = earliestExpiry
      ? daysUntil(new Date(earliestExpiry).toISOString())
      : null;
    const status = getSeatStatus(
      activeStudents.length,
      daysLeft,
      expiredStudents.length,
    );

    // Build per-shift occupancy
    const shiftOccupancy = shiftCodes.map((code) => {
      const shiftDetails = shifts?.find(s => s.code === code)
      const shiftTiming = shiftDetails?.start_time ? `${shiftDetails.start_time} - ${shiftDetails.end_time}` : ''

      // Find a student who has this shift selected and is active
      const activeStudent = activeStudents.find((s: any) =>
        s.selected_shifts?.includes(code),
      );
      const expiredStudent = expiredStudents.find((s: any) =>
        s.selected_shifts?.includes(code),
      );

      if (activeStudent) {
        const sDaysLeft = daysUntil(activeStudent.end_date);
        return {
          shift: code,
          shiftTiming,
          status:
            sDaysLeft <= 7 ? ("expiring" as const) : ("occupied" as const),
          studentName: activeStudent.name,
          fatherName: activeStudent.father_name,
          endDate: activeStudent.end_date,
          daysLeft: sDaysLeft,
          paymentStatus: activeStudent.payment_status,
          amountPaid: activeStudent.amount_paid,
          discountAmount: activeStudent.discount_amount,
          totalFee: activeStudent.total_fee,
          student: activeStudent,
        };
      }
      if (expiredStudent) {
        return {
          shift: code,
          shiftTiming,
          status: "expired" as const,
          studentName: expiredStudent.name,
          fatherName: expiredStudent.father_name,
          endDate: expiredStudent.end_date,
          daysLeft: daysUntil(expiredStudent.end_date),
          paymentStatus: expiredStudent.payment_status,
          amountPaid: expiredStudent.amount_paid,
          discountAmount: expiredStudent.discount_amount,
          totalFee: expiredStudent.total_fee,
          student: expiredStudent,
        };
      }
      return {
        shift: code,
        shiftTiming,
        status: "vacant" as const,
        studentName: null,
        fatherName: null,
        endDate: null,
        daysLeft: null,
        student: null,
      };
    });

    return {
      id: seat.id,
      seat_number: seat.seat_number,
      gender: seat.gender,
      status,
      daysLeft,
      shiftDisplay:
        activeStudents[0]?.shift_display ||
        expiredStudents[0]?.shift_display ||
        "",
      hasLocker:
        activeStudents.some((s: any) => s.locker_id) ||
        expiredStudents.some((s: any) => s.locker_id),
      shiftOccupancy,
      // Pass full student details for the detail sheet
      active_student: activeStudents[0]
        ? {
            id: activeStudents[0].id,
            name: activeStudents[0].name,
            phone: activeStudents[0].phone || "",
            shift_display: activeStudents[0].shift_display,
            end_date: activeStudents[0].end_date,
            payment_status: activeStudents[0].payment_status,
            has_locker: !!activeStudents[0].locker_id,
            total_fee: activeStudents[0].total_fee,
          }
        : undefined,
      expired_student: expiredStudents[0]
        ? {
            id: expiredStudents[0].id,
            name: expiredStudents[0].name,
            end_date: expiredStudents[0].end_date,
          }
        : undefined,
    };
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="bg-white px-6 py-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] rounded-3xl border border-gray-100 mt-[50px] mb-[50px] flex items-center justify-between mx-4 md:mx-auto max-w-7xl">
        <h2 className="text-xl md:text-2xl font-serif text-brand-900 leading-none">
          Seat Map
        </h2>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {
                seatsWithStatus.filter(
                  (s) => s.status === "occupied" || s.status === "expiring",
                ).length
              }
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {seatsWithStatus.filter((s) => s.status === "free").length}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-full overflow-x-hidden">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-hidden">
          <InteractiveGrid
            initialSeats={seatsWithStatus}
            comboPlans={comboPlans || []}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-lg bg-brand-100 border-2 border-brand-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Occupied
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-lg bg-amber-100 border-2 border-amber-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Expiring Soon
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-lg bg-red-100 border-2 border-red-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Expired
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-lg bg-white border-2 border-gray-200" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
