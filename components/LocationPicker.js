'use client';

import { useEffect, useState } from 'react';

const API = 'https://bdapis.com/api/v1.2';

export default function LocationPicker({ value, onChange }) {
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDivisions() {
      try {
        const res = await fetch(API + '/divisions');
        const json = await res.json();
        setDivisions(json.data || []);
      } catch (err) {
        setError('Could not load the location list. Check your internet connection.');
      }
    }
    loadDivisions();
  }, []);

  useEffect(() => {
    if (!value.division) {
      setDistricts([]);
      return;
    }
    async function loadDistricts() {
      try {
        const res = await fetch(API + '/division/' + value.division.toLowerCase());
        const json = await res.json();
        setDistricts(json.data || []);
      } catch (err) {
        setError('Could not load the district list.');
      }
    }
    loadDistricts();
  }, [value.division]);

  let upazilas = [];
  for (let i = 0; i < districts.length; i++) {
    if (districts[i].district === value.district) {
      upazilas = districts[i].upazilla;
    }
  }

  function changeDivision(e) {
    onChange({ division: e.target.value, district: '', upazila: '' });
  }

  function changeDistrict(e) {
    onChange({ division: value.division, district: e.target.value, upazila: '' });
  }

  function changeUpazila(e) {
    onChange({ division: value.division, district: value.district, upazila: e.target.value });
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="form-grid-3">
        <label>
          Division
          <select value={value.division} onChange={changeDivision} required>
            <option value="">Select division</option>
            {divisions.map((d) => (
              <option key={d.division} value={d.division}>{d.division} ({d.divisionbn})</option>
            ))}
          </select>
        </label>
        <label>
          District
          <select value={value.district} onChange={changeDistrict} disabled={!value.division} required>
            <option value="">Select district</option>
            {districts.map((d) => (
              <option key={d.district} value={d.district}>{d.district} ({d.districtbn})</option>
            ))}
          </select>
        </label>
        <label>
          Upazila
          <select value={value.upazila} onChange={changeUpazila} disabled={!value.district} required>
            <option value="">Select upazila</option>
            {upazilas.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}