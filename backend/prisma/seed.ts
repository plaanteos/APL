import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear administrador por defecto
  const hashedPassword = await bcrypt.hash('AdminAnto17$', 12);
  
  const admin = await prisma.administrador.upsert({
    where: { email: 'admin@apl-dental.com' },
    update: {},
    create: {
      email: 'admin@apl-dental.com',
      username: 'AdminAnto',
      password: hashedPassword,
      nombres: 'Administrador',
      apellidos: 'APL',
      telefono: '+598 99 999 999',
      rol: 'ADMIN',
    },
  });

  console.log('✅ Administrador creado:', admin);

  // Crear clientes de ejemplo
  const clientes = await Promise.all([
    prisma.cliente.create({
      data: {
        nombre: 'Clínica Dental Sonrisa',
        email: 'contacto@sonrisa.com',
        telefono: '+598 99 123 456',
        whatsapp: '+598991234567',
        tipo: 'CLINICA',
        direccion: 'Av. 18 de Julio 1234',
        ciudad: 'Montevideo',
        codigoPostal: '11200',
        observaciones: 'Cliente premium con descuentos especiales',
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: 'Dr. Juan Pérez',
        email: 'juan.perez@email.com',
        telefono: '+598 99 234 567',
        whatsapp: '+598992345678',
        tipo: 'ODONTOLOGO',
        direccion: 'Bulevar Artigas 987',
        ciudad: 'Montevideo',
        codigoPostal: '11600',
        observaciones: 'Odontólogo especialista en ortodoncias',
      },
    }),
    prisma.cliente.create({
      data: {
        nombre: 'Odontología Integral',
        email: 'info@integral.com',
        telefono: '+598 99 345 678',
        whatsapp: '+598993456789',
        tipo: 'CLINICA',
        direccion: 'Rivera 2100',
        ciudad: 'Montevideo',
        codigoPostal: '11800',
      },
    }),
  ]);

  console.log('✅ Clientes creados:', clientes.length);

  // Crear pedidos de ejemplo
  const pedidos = await Promise.all([
    prisma.pedido.create({
      data: {
        clienteId: clientes[0].id,
        numeroPedido: 'PED-001-2026',
        nombrePaciente: 'María González',
        fechaPedido: new Date(),
        fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        descripcion: 'Corona de porcelana para molar superior derecho',
        tipoPedido: 'Corona',
        cantidad: 1,
        precioUnitario: 15000,
        montoTotal: 15000,
        montoPagado: 0,
        montoPendiente: 15000,
        estado: 'PENDIENTE',
        prioridad: 'NORMAL',
        observaciones: 'Color A2, tomar impresión digital',
      },
    }),
    prisma.pedido.create({
      data: {
        clienteId: clientes[1].id,
        numeroPedido: 'PED-002-2026',
        nombrePaciente: 'Carlos Rodríguez',
        fechaPedido: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
        fechaVencimiento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 días
        descripcion: 'Placa ortopédica superior',
        tipoPedido: 'Ortopedia',
        cantidad: 1,
        precioUnitario: 25000,
        montoTotal: 25000,
        montoPagado: 12500,
        montoPendiente: 12500,
        estado: 'EN_PROCESO',
        prioridad: 'ALTA',
        observaciones: 'Mordida abierta, ajustar con retenedores',
      },
    }),
    prisma.pedido.create({
      data: {
        clienteId: clientes[2].id,
        numeroPedido: 'PED-003-2026',
        nombrePaciente: 'Ana Martínez',
        fechaPedido: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás
        fechaVencimiento: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Vencido hace 1 día
        descripcion: 'Puente fijo de 3 piezas',
        tipoPedido: 'Puente',
        cantidad: 1,
        precioUnitario: 45000,
        montoTotal: 45000,
        montoPagado: 45000,
        montoPendiente: 0,
        estado: 'PAGADO',
        prioridad: 'NORMAL',
        observaciones: 'Entregado y pagado en su totalidad',
      },
    }),
  ]);

  console.log('✅ Pedidos creados:', pedidos.length);

  // Crear detalles de pedidos
  const detallesPedido = await Promise.all([
    prisma.detallePedido.create({
      data: {
        pedidoId: pedidos[0].id,
        descripcion: 'Corona de porcelana',
        tipoTrabajo: 'Corona',
        material: 'Porcelana feldespática',
        cantidad: 1,
        precioUnitario: 15000,
        subtotal: 15000,
        observaciones: 'Color A2 según guía Vita',
      },
    }),
    prisma.detallePedido.create({
      data: {
        pedidoId: pedidos[1].id,
        descripcion: 'Placa ortopédica',
        tipoTrabajo: 'Ortopedia',
        material: 'Acrílico transparente',
        cantidad: 1,
        precioUnitario: 20000,
        subtotal: 20000,
      },
    }),
    prisma.detallePedido.create({
      data: {
        pedidoId: pedidos[1].id,
        descripcion: 'Retenedores',
        tipoTrabajo: 'Ortopedia',
        material: 'Alambre ortodóncico',
        cantidad: 2,
        precioUnitario: 2500,
        subtotal: 5000,
      },
    }),
  ]);

  console.log('✅ Detalles de pedidos creados:', detallesPedido.length);

  // Crear pagos de ejemplo
  const pagos = await Promise.all([
    prisma.pago.create({
      data: {
        pedidoId: pedidos[1].id,
        numeroPago: 'PAG-001-2026',
        monto: 12500,
        metodoPago: 'TRANSFERENCIA',
        fechaPago: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        numeroTransf: 'TRANS123456',
        observaciones: 'Pago del 50% por adelantado',
      },
    }),
    prisma.pago.create({
      data: {
        pedidoId: pedidos[2].id,
        numeroPago: 'PAG-002-2026',
        monto: 45000,
        metodoPago: 'EFECTIVO',
        fechaPago: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        numeroRecibo: 'REC-001-2026',
        observaciones: 'Pago completo al momento de la entrega',
      },
    }),
  ]);

  console.log('✅ Pagos creados:', pagos.length);

  // Crear algunos logs de auditoría
  const auditLogs = await Promise.all([
    prisma.auditoria.create({
      data: {
        administradorId: admin.id,
        accion: 'CREAR',
        tipoEntidad: 'cliente',
        entidadId: clientes[0].id,
        valoresNuevos: {
          nombre: clientes[0].nombre,
          email: clientes[0].email,
        },
        direccionIP: '192.168.1.100',
        descripcion: 'Creación del cliente: Clínica Dental Sonrisa',
      },
    }),
    prisma.auditoria.create({
      data: {
        administradorId: admin.id,
        accion: 'CREAR',
        tipoEntidad: 'pedido',
        entidadId: pedidos[0].id,
        valoresNuevos: {
          numeroPedido: pedidos[0].numeroPedido,
          nombrePaciente: pedidos[0].nombrePaciente,
        },
        direccionIP: '192.168.1.100',
        descripcion: 'Creación del pedido: PED-001-2026',
      },
    }),
  ]);

  console.log('✅ Logs de auditoría creados:', auditLogs.length);

  console.log('🎉 Seed completado exitosamente!');
  console.log('📧 Email: admin@apl-dental.com');
  console.log('👤 Usuario: AdminAnto');
  console.log('🔑 Contraseña: AdminAnto17$');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });