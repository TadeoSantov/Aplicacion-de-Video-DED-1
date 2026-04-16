import { PrismaClient } from "../generated/prisma/client.js";

const prisma = new PrismaClient()

export const crearUsuario = async(datos) => {
    return await prisma.usuario.create({
        data: datos,
    });
};

export async function eliminarUsuario(id){
    await prisma.usuario.delete({
        where:{id}
    })
}

export async function obtenerUsuarioporid(id){
      const u = await prisma.usuario.findUnique({
        where:{id},
        select:{
         nombre_de_usuario:true,
         id:true,
         admin:true,
         facultad_id:true,
         facultad:{
            select:{
                nombre:true,
            }
         }   
        }
    })

if (!u) return null;

  return {
    ...u,
    facultad_nombre: u.facultad?.nombre ?? null,
  };
}

export async function ObtenerTodos() {
  const usuarios = await prisma.usuario.findMany({
    include: {
      facultad: {
        select: {
          nombre: true,
        },
      },
      _count: {
        select: {
          videos: true,
          sesiones: true,
        },
      },
    },
  });

  return usuarios.map((u) => ({
    id: u.id,
    admin: u.admin,
    nombreUsuario: u.nombre_de_usuario,
    nombreFacultad: u.facultad?.nombre ?? null,
    fecha_de_registro: u.fecha_de_registro,
    totalVideos: u._count.videos,
    tieneSesionActiva: u._count.sesiones > 0,
    Baja: u.baja,
  }));
}


export  function obtenerPorNombre(nombre_de_usuario){
    return  prisma.usuario.findUnique({
        where:{nombre_de_usuario},
        select:{
         nombre_de_usuario:true,
         id:true,
         password: true,
         admin:true,
         baja:true,
         facultad_id:true,
         facultad:{
            select:{
                nombre:true,
            }
         }   
        }
    })
}

export async function Count(facultad_id) {
    return prisma.usuario.count({
  where: {
    facultad_id: facultad_id
  }
});
}

export async function TraerAdmin() {
    return prisma.usuario.findFirst({
        where: {admin:true}
    })
}


export async function Actualizar(id, data) {
    return prisma.usuario.update({
        where:{id},
        data
    })
}



