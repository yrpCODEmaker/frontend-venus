import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { formatItemJSON } from '../utils/formatters';

// Registrar fuentes (opcional, usar fuentes estándar por defecto)
// Font.register({ family: 'Inter', src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333333',
    backgroundColor: '#ffffff'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 20
  },
  logoSection: {
    flexDirection: 'column'
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
    textTransform: 'uppercase'
  },
  companyInfo: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4
  },
  invoiceTitleSection: {
    alignItems: 'flex-end'
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a8a', // Dark blue/indigo
    marginBottom: 5
  },
  invoiceDetails: {
    fontSize: 10,
    textAlign: 'right',
    lineHeight: 1.5,
    color: '#444'
  },
  bold: {
    fontWeight: 'bold'
  },
  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5
  },
  clientColumn: {
    flexDirection: 'column',
    width: '48%'
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 3
  },
  clientText: {
    fontSize: 10,
    lineHeight: 1.5
  },
  table: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    marginBottom: 30
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 8,
    fontSize: 9,
    alignItems: 'center'
  },
  colProduct: { width: '40%' },
  colDetails: { width: '30%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '10%', textAlign: 'right' },
  colSubtotal: { width: '10%', textAlign: 'right' },
  
  productName: {
    fontWeight: 'bold',
    fontSize: 10,
    marginBottom: 2
  },
  productDesc: {
    fontSize: 8,
    color: '#64748b'
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  totalsBox: {
    width: '40%',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 10
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#0f172a'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  }
});

// Helper for currency formatting
const formatCurrency = (val) => {
  const num = Number(val || 0);
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper for date formatting
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const InvoicePDF = ({ factura, companyInfo }) => {
  const items = factura.items || [];
  
  // Calculate values
  const totalAmount = factura.total || items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const totalPaid = factura.pagos?.reduce((acc, p) => acc + (p.monto || 0), 0) || 0;
  const balance = totalAmount - totalPaid;

  const invoiceNumber = `FAC-${String(factura.id).padStart(5, '0')}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>{companyInfo?.nombre_empresa || 'Muebles Venus SRL'}</Text>
            <Text style={styles.companyInfo}>RNC: {companyInfo?.rnc || 'N/A'}</Text>
            <Text style={styles.companyInfo}>Tel: {companyInfo?.telefono || 'N/A'}</Text>
            <Text style={styles.companyInfo}>{companyInfo?.direccion || ''}</Text>
          </View>
          <View style={styles.invoiceTitleSection}>
            <Text style={styles.invoiceTitle}>FACTURA</Text>
            <Text style={styles.invoiceDetails}><Text style={styles.bold}>No:</Text> {invoiceNumber}</Text>
            <Text style={styles.invoiceDetails}><Text style={styles.bold}>Fecha:</Text> {formatDate(factura.fecha)}</Text>
            <Text style={styles.invoiceDetails}><Text style={styles.bold}>Estado:</Text> {balance <= 0 ? 'PAGADA' : 'PENDIENTE'}</Text>
          </View>
        </View>

        {/* CLIENT DETAILS */}
        <View style={styles.clientSection}>
          <View style={styles.clientColumn}>
            <Text style={styles.sectionTitle}>Facturado a:</Text>
            <Text style={styles.clientText}><Text style={styles.bold}>Nombre:</Text> {factura.cliente?.nombre} {factura.cliente?.apellido}</Text>
            <Text style={styles.clientText}><Text style={styles.bold}>Teléfono:</Text> {factura.cliente?.telefono || 'N/A'}</Text>
            <Text style={styles.clientText}><Text style={styles.bold}>Dirección:</Text> {factura.cliente?.domicilio || 'N/A'}</Text>
          </View>
          <View style={styles.clientColumn}>
            <Text style={styles.sectionTitle}>Detalles de Entrega:</Text>
            <Text style={styles.clientText}>{factura.entrega_domicilio ? 'Entrega a Domicilio' : 'Recogida en Tienda'}</Text>
            {factura.entrega_domicilio && (
              <Text style={styles.clientText}>{factura.direccion_entrega || factura.cliente?.domicilio}</Text>
            )}
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colProduct}>Producto</Text>
            <Text style={styles.colDetails}>Detalles</Text>
            <Text style={styles.colQty}>Cant</Text>
            <Text style={styles.colPrice}>Precio</Text>
            <Text style={styles.colSubtotal}>Total</Text>
          </View>

          {items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.colProduct}>
                <Text style={styles.productName}>{item.nombre}</Text>
                {item.descripcion && <Text style={styles.productDesc}>{item.descripcion}</Text>}
              </View>
              <View style={styles.colDetails}>
                <Text style={styles.productDesc}>Mat: {formatItemJSON(item.material)}</Text>
                {item.tela && <Text style={styles.productDesc}>Tela: {formatItemJSON(item.tela)}</Text>}
              </View>
              <Text style={styles.colQty}>{item.cantidad}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.subtotal / item.cantidad)}</Text>
              <Text style={styles.colSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Abonado:</Text>
              <Text>{formatCurrency(totalPaid)}</Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text>Total a Pagar:</Text>
              <Text>{formatCurrency(balance > 0 ? balance : 0)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Gracias por preferir nuestros muebles. Este documento es válido como comprobante de su encargo o compra.
        </Text>
        
      </Page>
    </Document>
  );
};

export default InvoicePDF;
