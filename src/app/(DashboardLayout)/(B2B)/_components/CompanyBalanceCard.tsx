"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import {
  IconWallet,
  IconReceipt2,
  IconClockHour4,
} from "@tabler/icons-react";
import { B2BCompany } from "@/types/b2b";

interface CompanyBalanceCardProps {
  company: B2BCompany;
}

export const CompanyBalanceCard: React.FC<CompanyBalanceCardProps> = ({
  company,
}) => {
  const isOverdue = company.balance > 0 && company.status === "suspended";

  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconWallet size={22} color="#1976D2" />
          <Typography variant="h6" fontWeight={600}>
            Estado de Cuenta y Saldo
          </Typography>
        </Stack>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            bgcolor: isOverdue ? "error.light" : "primary.light",
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Saldo Pendiente por Cobrar
          </Typography>
          <Typography
            variant="h3"
            fontWeight={700}
            color={isOverdue ? "error.main" : "primary.main"}
            sx={{ my: 0.5 }}
          >
            ${(company.balance || 0).toFixed(2)} USD
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Condición acordada:{" "}
            <strong>
              {company.paymentCondition === "cash" && "Efectivo"}
              {company.paymentCondition === "transfer" && "Transferencia Bancaria"}
              {company.paymentCondition === "card" && "Tarjeta de Crédito"}
              {company.paymentCondition === "credit_15" && "Crédito a 15 días"}
              {company.paymentCondition === "credit_30" && "Crédito a 30 días"}
            </strong>
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Facturación Requerida:
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {company.requiresInvoice && (
                <Chip label="Factura" size="small" variant="outlined" />
              )}
              {company.requiresCCF && (
                <Chip
                  label="Crédito Fiscal (CCF)"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
              {!company.requiresInvoice && !company.requiresCCF && (
                <Chip label="Ninguna" size="small" variant="outlined" />
              )}
            </Stack>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              NIT / NRC:
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {company.nit} / {company.nrc}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CompanyBalanceCard;
