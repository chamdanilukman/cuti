import React from 'react';
import V2PageShell from './V2PageShell';
import AboutPage from '../AboutPage';

const TataCaraPage: React.FC = () => (
  <V2PageShell
    eyebrow="Panduan"
    title="Tata Cara"
    description="Panduan penggunaan Sistem Cuti Elektronik Dinas Pendidikan Kabupaten Grobogan."
  >
    <AboutPage />
  </V2PageShell>
);

export default TataCaraPage;
