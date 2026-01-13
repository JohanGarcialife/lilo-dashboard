'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ViajesTable from '../_components/ViajesTable';




const SamplePage = () => {
  return (
    <PageContainer title="Viajes Completados" description="Riders with active status">

        <ViajesTable />

    </PageContainer>
  );
};

export default SamplePage;

