'use client';
import { Typography } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import ListPassengers from '../_components/ListPassengers';


const SamplePage = () => {
  return (
    <PageContainer title="Active Passengers" description="Passengers with active status">
     
        <ListPassengers />
      
    </PageContainer>
  );
};

export default SamplePage;

