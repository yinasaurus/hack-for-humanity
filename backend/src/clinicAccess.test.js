import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clinicIdOf,
  clinicianCanAccessPatient,
  patientsInClinic,
  DEFAULT_CLINIC_ID,
} from './clinicAccess.js';

describe('clinicAccess', () => {
  const clinicA = {
    id: 'c1',
    role: 'clinician',
    clinicId: 'clinic-a',
  };
  const clinicB = {
    id: 'c2',
    role: 'clinician',
    clinicId: 'clinic-b',
  };
  const patientA = {
    id: 'p1',
    role: 'patient',
    clinicId: 'clinic-a',
  };
  const patientB = {
    id: 'p2',
    role: 'patient',
    clinicId: 'clinic-b',
  };

  it('defaults missing clinicId to DEFAULT_CLINIC_ID', () => {
    assert.equal(clinicIdOf({ role: 'patient' }), DEFAULT_CLINIC_ID);
  });

  it('clinician only accesses same-clinic patients', () => {
    assert.equal(clinicianCanAccessPatient(clinicA, patientA), true);
    assert.equal(clinicianCanAccessPatient(clinicA, patientB), false);
    assert.equal(clinicianCanAccessPatient(clinicB, patientA), false);
  });

  it('filters patient list by clinic', () => {
    const db = { users: [patientA, patientB, clinicA] };
    const list = patientsInClinic(db, 'clinic-a');
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'p1');
  });
});
