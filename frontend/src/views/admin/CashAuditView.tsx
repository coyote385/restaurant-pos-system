import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, TextField, CircularProgress, IconButton, Button,
  Grid, Card, CardContent, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { CorteZReceiptModal, CorteZData } from '../cashier/CorteZReceiptModal';

export const CashAuditView: React.FC = () => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedShiftForPrint, setSelectedShiftForPrint] = useState<CorteZData | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const url = dateFilter ? `/api/cash/history?date=${dateFilter}` : '/api/cash/history';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        setShifts(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalClosed = shifts.filter((s) => !s.isOpen).length;
  const totalSalesRecorded = shifts.reduce((acc, s) => {
    return acc + Number(s.totalSalesCash || 0) + Number(s.totalSalesCard || 0) + Number(s.totalSalesTrans || 0);
  }, 0);
  const totalDifference = shifts.filter((s) => !s.isOpen).reduce((acc, s) => acc + Number(s.difference || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PointOfSaleIcon color="primary" /> Arqueos y Cuadres de Caja (Corte Z)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Auditoría de aperturas, ventas por medio de pago y descuadres de gaveta física.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            label="Filtrar por Fecha"
            InputLabelProps={{ shrink: true }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: 170 }}
          />
          {dateFilter && (
            <Button size="small" onClick={() => setDateFilter('')}>
              Ver Todos
            </Button>
          )}
          <Tooltip title="Actualizar historial">
            <IconButton onClick={fetchHistory} disabled={loading} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, borderLeft: '5px solid #1976d2' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Turnos Cerrados Auditados</Typography>
              <Typography variant="h5" fontWeight="bold">{totalClosed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, borderLeft: '5px solid #2e7d32' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Facturado en Turnos</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.dark">
                ${totalSalesRecorded.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: 1,
              borderLeft: `5px solid ${
                totalDifference === 0 ? '#4caf50' : totalDifference > 0 ? '#ff9800' : '#f44336'
              }`,
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Descuadre Neto Acumulado</Typography>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={
                  totalDifference === 0 ? 'success.main' : totalDifference > 0 ? 'warning.main' : 'error.main'
                }
              >
                {totalDifference === 0
                  ? '$0 (Exacto)'
                  : totalDifference > 0
                  ? `+$${totalDifference.toLocaleString()} (Sobrante)`
                  : `-$${Math.abs(totalDifference).toLocaleString()} (Faltante)`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Historial Table */}
      {loading && shifts.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Estado</strong></TableCell>
                <TableCell><strong>Cajero</strong></TableCell>
                <TableCell><strong>Apertura</strong></TableCell>
                <TableCell><strong>Cierre</strong></TableCell>
                <TableCell align="right"><strong>Base Inicial</strong></TableCell>
                <TableCell align="right"><strong>Efectivo</strong></TableCell>
                <TableCell align="right"><strong>Tarjeta</strong></TableCell>
                <TableCell align="right"><strong>Transf.</strong></TableCell>
                <TableCell align="right"><strong>Esperado</strong></TableCell>
                <TableCell align="right"><strong>Contado</strong></TableCell>
                <TableCell align="center"><strong>Diferencia</strong></TableCell>
                <TableCell align="center"><strong>Acción</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No hay turnos de caja registrados.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => {
                  const diff = Number(shift.difference || 0);
                  const isClosed = !shift.isOpen;

                  return (
                    <TableRow key={shift.id} hover>
                      <TableCell>
                        {shift.isOpen ? (
                          <Chip label="EN CURSO" color="success" size="small" sx={{ fontWeight: 'bold' }} />
                        ) : (
                          <Chip label="CERRADO" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {shift.openedBy?.name || 'Cajero'}
                      </TableCell>
                      <TableCell>
                        {new Date(shift.openedAt).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell>
                        {shift.closedAt
                          ? new Date(shift.closedAt).toLocaleString('es-CO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell align="right">
                        ${Number(shift.initialCash).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
                        ${Number(shift.totalSalesCash || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        ${Number(shift.totalSalesCard || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        ${Number(shift.totalSalesTrans || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {shift.expectedCash ? `$${Number(shift.expectedCash).toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {shift.actualCash !== null && shift.actualCash !== undefined
                          ? `$${Number(shift.actualCash).toLocaleString()}`
                          : '—'}
                      </TableCell>
                      <TableCell align="center">
                        {!isClosed ? (
                          <Typography variant="caption" color="text.secondary">En vivo</Typography>
                        ) : diff === 0 ? (
                          <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label="$0 Cuadrado"
                            color="success"
                            size="small"
                          />
                        ) : diff > 0 ? (
                          <Chip
                            icon={<WarningAmberIcon />}
                            label={`+$${diff.toLocaleString()}`}
                            color="warning"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<ErrorOutlineIcon />}
                            label={`-$${Math.abs(diff).toLocaleString()}`}
                            color="error"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {isClosed ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            onClick={() => setSelectedShiftForPrint(shift)}
                            sx={{ textTransform: 'none' }}
                          >
                            Corte Z
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Modal para Reimprimir Tirilla Térmica Corte Z */}
      <CorteZReceiptModal
        open={Boolean(selectedShiftForPrint)}
        onClose={() => setSelectedShiftForPrint(null)}
        data={selectedShiftForPrint}
      />
    </Box>
  );
};
