/** Minimal clinic binding — clinicians only see patients in the same clinic. */

export const DEFAULT_CLINIC_ID = process.env.DEFAULT_CLINIC_ID || 'clinic-demo';

export function clinicIdOf(user) {
  return user?.clinicId || DEFAULT_CLINIC_ID;
}

export function patientsInClinic(db, clinicId) {
  const cid = clinicId || DEFAULT_CLINIC_ID;
  return (db.users || []).filter(
    (u) => u.role === 'patient' && clinicIdOf(u) === cid
  );
}

export function clinicianCanAccessPatient(clinicianUser, patient) {
  if (!clinicianUser || clinicianUser.role !== 'clinician') return false;
  if (!patient || patient.role !== 'patient') return false;
  return clinicIdOf(clinicianUser) === clinicIdOf(patient);
}
