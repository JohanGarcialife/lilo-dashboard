'use client';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import ListRiders from '../_components/ListRiders';



const SamplePage = () => {
  return (
    <PageContainer title="Active Riders" description="Riders with active status">
     
        <ListRiders />
      
    </PageContainer>
  );
};

export default SamplePage;

