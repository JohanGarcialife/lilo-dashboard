'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ViajesCanceladosTable from '../_components/ViajesCancelados';




const SamplePage = () => {
  return (
    <PageContainer title="Viajes Cancelados" description="Riders with active status">
     
        <ViajesCanceladosTable />
      
    </PageContainer>
  );
};

export default SamplePage;

