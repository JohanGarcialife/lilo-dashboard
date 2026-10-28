"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  IconBuilding,
  IconPlus,
  IconSearch,
  IconEye,
  IconEdit,
  IconPhone,
  IconBrandWhatsapp,
  IconCopy,
  IconKey,
} from "@tabler/icons-react";
import Link from "next/link";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import { B2BCompany } from "@/types/b2b";
import {
  subscribeToB2BCompanies,
  createB2BCompany,
  updateB2BCompany,
} from "@/services/b2b";
import StatusBadge from "../_components/StatusBadge";
import CompanyForm from "../_components/CompanyForm";
import toast from "react-hot-toast";
import { Chip, Alert } from "@mui/material";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmpresasPage() {
  const { isEn } = useLanguage();
  const [companies, setCompanies] = useState<B2BCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<B2BCompany | null>(
    null
  );
  const [createdCredentials, setCreatedCredentials] = useState<{
    tradeName: string;
    email: string;
    password: string;
    whatsapp?: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToB2BCompanies(
      (data) => {
        setCompanies(data);
        setLoading(false);
      },
      (err) => {
        console.error("[EmpresasPage] Error suscribiéndose a empresas:", err);
        setLoading(false);
        toast.error("Error al cargar empresas: " + (err.message || ""));
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenCreate = () => {
    setSelectedCompany(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (company: B2BCompany) => {
    setSelectedCompany(company);
    setOpenModal(true);
  };

  const handleSubmit = async (
    data: Omit<B2BCompany, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (selectedCompany) {
        await updateB2BCompany(selectedCompany.id, data);
        toast.success("Empresa actualizada exitosamente");
        if (data.initialPassword && data.initialPassword.trim().length >= 6) {
          setCreatedCredentials({
            tradeName: data.tradeName,
            email: data.email.trim().toLowerCase(),
            password: data.initialPassword.trim(),
            whatsapp: data.whatsapp,
          });
        }
      } else {
        const result = await createB2BCompany(data);
        toast.success("Empresa B2B y credenciales creadas exitosamente");
        const effectivePassword = result?.provisionalPassword || data.initialPassword?.trim();
        if (effectivePassword) {
          setCreatedCredentials({
            tradeName: data.tradeName,
            email: data.email.trim().toLowerCase(),
            password: effectivePassword,
            whatsapp: data.whatsapp,
          });
        }
      }
    } catch (err: any) {
      toast.error("Error al guardar empresa: " + (err.message || ""));
      throw err;
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.tradeName?.toLowerCase().includes(q) ||
      c.legalName?.toLowerCase().includes(q) ||
      c.nit?.includes(q) ||
      c.contactName?.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer
      title="Empresas B2B | Lilo El Salvador"
      description="Gestión integral de empresas corporativas y cuentas B2B"
    >
      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {isEn ? "B2B Companies (El Salvador)" : "Empresas B2B (El Salvador)"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEn
                ? "Corporate clients directory and tariff management."
                : "Control y gestión de clientes corporativos B2B."}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={18} />}
            onClick={handleOpenCreate}
            sx={{ px: 2.5, py: 1 }}
          >
            {isEn ? "New Company" : "Nueva Empresa"}
          </Button>
        </Stack>
      </Box>

      {/* Métricas rápidas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Empresas Registradas
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                {companies.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Empresas Activas
              </Typography>
              <Typography variant="h4" fontWeight={700} color="success.main" sx={{ mt: 0.5 }}>
                {companies.filter((c) => c.status === "active").length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Saldo Global por Cobrar
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
                $
                {companies
                  .reduce((acc, c) => acc + (c.balance || 0), 0)
                  .toFixed(2)}{" "}
                USD
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla con Búsqueda */}
      <DashboardCard title="Directorio Corporativo">
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nombre comercial, razón social, NIT o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <LinearProgress sx={{ my: 3 }} />
        ) : filteredCompanies.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <IconBuilding size={48} color="#94A3B8" />
            <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
              {search
                ? "No se encontraron empresas con ese criterio de búsqueda."
                : "No hay empresas B2B registradas todavía."}
            </Typography>
            {!search && (
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={handleOpenCreate}
              >
                Crear Primera Empresa
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Empresa / Razón Social</TableCell>
                  <TableCell>Plan y Esquema</TableCell>
                  <TableCell>NIT / NRC</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Condición de Pago</TableCell>
                  <TableCell align="right">Saldo Pendiente</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompanies.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {c.tradeName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.legalName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={
                          isEn
                            ? `B2B · $${Number(c.negotiatedFareRate ?? 0.67).toFixed(2)}/km`
                            : `Corporativo · $${Number(c.negotiatedFareRate ?? 0.67).toFixed(2)}/km`
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.nit}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        NRC: {c.nrc}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.contactName}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title="Teléfono">
                          <IconPhone size={14} color="#64748B" />
                        </Tooltip>
                        <Typography variant="caption" color="text.secondary">
                          {c.phone}
                        </Typography>
                        {c.whatsapp && (
                          <Tooltip title={`WhatsApp: ${c.whatsapp}`}>
                            <IconBrandWhatsapp size={14} color="#22C55E" />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                        {c.paymentCondition === "cash" && "Efectivo"}
                        {c.paymentCondition === "transfer" && "Transferencia"}
                        {c.paymentCondition === "card" && "Tarjeta"}
                        {c.paymentCondition === "credit_15" && "Crédito 15d"}
                        {c.paymentCondition === "credit_30" && "Crédito 30d"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        color={c.balance > 0 ? "error.main" : "text.primary"}
                      >
                        ${(c.balance || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <StatusBadge status={c.status} type="company" />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Ver Detalle y Estado de Cuenta">
                          <IconButton
                            size="small"
                            component={Link}
                            href={`/Empresas/${c.id}`}
                            color="primary"
                          >
                            <IconEye size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar Empresa">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(c)}
                            color="default"
                          >
                            <IconEdit size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DashboardCard>

      {/* Modal Formulario */}
      <CompanyForm
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleSubmit}
        initialData={selectedCompany}
      />

      {/* Modal de Resumen de Credenciales B2B Generadas */}
      <Dialog
        open={Boolean(createdCredentials)}
        onClose={() => setCreatedCredentials(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconKey size={22} color="#5D87FF" />
            <Typography variant="h6" fontWeight={700}>
              Credenciales de Acceso — Portal B2B
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {createdCredentials && (
            <Stack spacing={2}>
              <Alert severity="success">
                La cuenta de acceso al Portal Corporativo B2B para{" "}
                <strong>{createdCredentials.tradeName}</strong> está lista. Al
                iniciar sesión por primera vez, el sistema le pedirá configurar
                su contraseña definitiva.
              </Alert>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "grey.100",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Portal B2B:</strong>{" "}
                  <code>http://localhost:3002/login</code>
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Correo Electrónico:</strong>{" "}
                  <code>{createdCredentials.email}</code>
                </Typography>
                <Typography variant="body2">
                  <strong>Contraseña Temporal (1er Login):</strong>{" "}
                  <code>{createdCredentials.password}</code>
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {createdCredentials && (
            <>
              <Button
                variant="outlined"
                startIcon={<IconCopy size={16} />}
                onClick={() => {
                  const text = `Portal Corporativo Lilo B2B (${createdCredentials.tradeName})\nAcceso: http://localhost:3002/login\nCorreo: ${createdCredentials.email}\nContraseña temporal: ${createdCredentials.password}\n(En tu primer inicio de sesión el sistema te solicitará definir tu contraseña definitiva)`;
                  navigator.clipboard.writeText(text);
                  toast.success("Credenciales copiadas al portapapeles");
                }}
              >
                Copiar Credenciales
              </Button>
              {createdCredentials.whatsapp && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<IconBrandWhatsapp size={16} />}
                  onClick={() => {
                    const cleanPhone = createdCredentials.whatsapp!
                      .replace(/[^\d]/g, "");
                    const msg = encodeURIComponent(
                      `Hola, tus credenciales de acceso al Portal Corporativo Lilo B2B para *${createdCredentials.tradeName}* son:\n\n🔗 Portal: http://localhost:3002/login\n📧 Correo: ${createdCredentials.email}\n🔑 Contraseña temporal: ${createdCredentials.password}\n\nEn tu primer inicio de sesión se te solicitará configurar tu contraseña corporativa definitiva.`
                    );
                    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
                  }}
                >
                  Enviar por WhatsApp
                </Button>
              )}
            </>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={() => setCreatedCredentials(null)}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
