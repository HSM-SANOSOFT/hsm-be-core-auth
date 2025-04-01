export class PdpLogSegundaVerificacionModel {
  constructor(
    public ID?: number,
    public PRS_CODIGO?: string,
    public IP?: string,
    public FECHA?: Date,
    public ACCION?: string,
    public NUMERO_ENVIADO?: number,
    public ACCESO_INCORRECTO?: number,
    public TIPO?: string,
    public CEDULA?: string,
    public ESTADO?: string,
  ) {}
}
