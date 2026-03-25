// Nombre de las hojas de cálculo
    const HOJA_REGISTROS = "Todos los registros";
    const HOJA_FUNCIONARIOS = "Funcionarios";
    const HOJA_VISITAS_CONSOLIDADAS = "Visitas Consolidadas"; // Añadido

    // Índices de las columnas en la hoja Funcionarios (empezando desde 1)
    const COL_ID_FUNCIONARIO = 1;
    const COL_NOMBRE_FUNCIONARIO = 2;
    const COL_PISO_FUNCIONARIO = 3;
    const COL_DIRECCION_FUNCIONARIO = 4;
    const COL_TELEFONO_FUNCIONARIO = 5;

    // Índices de las columnas en la hoja Visitas Consolidadas (empezando desde 1)
    // A: Fecha Visita, B: Mes, C: Día Semana, D: Hora Entrada, E: Hora Salida,
    // F: Duración, G: Nombre Completo, H: RUT, I: Correo, J: Piso, K: Nombre Empresa
    const VC_COL_HORA_SALIDA = 5;      // Columna E
    const VC_COL_NOMBRE_VISITANTE = 7; // Columna G
    const VC_COL_RUT_VISITANTE = 8;    // Columna H

    const CORREO_AUTORIZADO = "TU_CORREO@gmail.com"; // Asegúrate que este sea el correcto

    function doGet(e) {
      const emailUsuarioActual = Session.getActiveUser().getEmail(); // Cambiado de usuarioActual a emailUsuarioActual para claridad
      let nombreUsuarioActual = "";
      let nombreUsuarioAutorizado = "";

      if (emailUsuarioActual) {
        nombreUsuarioActual = emailUsuarioActual.split('@')[0].toLowerCase();
      }

      if (CORREO_AUTORIZADO) {
        nombreUsuarioAutorizado = CORREO_AUTORIZADO.split('@')[0].toLowerCase();
      }
      
      Logger.log(`Intento de acceso: Email Usuario Actual = ${emailUsuarioActual}, Nombre Usuario Actual = ${nombreUsuarioActual}, Nombre Usuario Autorizado = ${nombreUsuarioAutorizado}`);

      if (nombreUsuarioActual && nombreUsuarioAutorizado && nombreUsuarioActual === nombreUsuarioAutorizado) {
        Logger.log(`Acceso concedido a: ${emailUsuarioActual} (Nombre de usuario: ${nombreUsuarioActual})`);
        return HtmlService.createTemplateFromFile('FormularioVisitas')
            .evaluate()
            .setTitle('Registro de Visitantes')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      } else {
        Logger.log(`Acceso denegado para: ${emailUsuarioActual} (Nombre de usuario: ${nombreUsuarioActual}). Se esperaba nombre de usuario: ${nombreUsuarioAutorizado}`);
        return HtmlService.createHtmlOutput(
          `<h1>Acceso Denegado</h1><p>No tienes permiso para acceder a este formulario. Por favor, contacta al administrador. (Usuario detectado: ${emailUsuarioActual || 'No identificado'})</p>`
        ).setTitle('Acceso Denegado');
      }
    }

    function incluir(nombreArchivo) {
      return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
    }

    function obtenerPisosUnicos() {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetFuncionarios = ss.getSheetByName(HOJA_FUNCIONARIOS);
        if (!sheetFuncionarios) throw new Error(`Hoja "${HOJA_FUNCIONARIOS}" no encontrada.`);
        const rangoPisos = sheetFuncionarios.getRange(2, COL_PISO_FUNCIONARIO, sheetFuncionarios.getLastRow() - 1, 1);
        const valoresPisos = rangoPisos.getValues();
        const pisosUnicos = [...new Set(valoresPisos.map(fila => fila[0]).filter(piso => piso && piso.toString().trim() !== ""))].sort();
        return pisosUnicos;
      } catch (error) {
        Logger.log("Error en obtenerPisosUnicos: " + error.message);
        return [];
      }
    }

    function obtenerDireccionesPorPiso(pisoSeleccionado) {
      try {
        if (!pisoSeleccionado) return [];
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetFuncionarios = ss.getSheetByName(HOJA_FUNCIONARIOS);
        if (!sheetFuncionarios) throw new Error(`Hoja "${HOJA_FUNCIONARIOS}" no encontrada.`);
        const todosLosDatos = sheetFuncionarios.getRange(2, 1, sheetFuncionarios.getLastRow() - 1, sheetFuncionarios.getLastColumn()).getValues();
        const direccionesFiltradas = todosLosDatos
          .filter(fila => fila[COL_PISO_FUNCIONARIO - 1] == pisoSeleccionado && fila[COL_DIRECCION_FUNCIONARIO - 1] && fila[COL_DIRECCION_FUNCIONARIO - 1].toString().trim() !== "")
          .map(fila => fila[COL_DIRECCION_FUNCIONARIO - 1]);
        const direccionesUnicas = [...new Set(direccionesFiltradas)].sort();
        return direccionesUnicas;
      } catch (error) {
        Logger.log(`Error en obtenerDireccionesPorPiso (${pisoSeleccionado}): ${error.message}`);
        return [];
      }
    }

    function obtenerFuncionariosPorPisoDireccion(pisoSeleccionado, direccionSeleccionada) {
      try {
        if (!pisoSeleccionado || !direccionSeleccionada) return [];
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetFuncionarios = ss.getSheetByName(HOJA_FUNCIONARIOS);
        if (!sheetFuncionarios) throw new Error(`Hoja "${HOJA_FUNCIONARIOS}" no encontrada.`);
        const todosLosDatos = sheetFuncionarios.getRange(2, 1, sheetFuncionarios.getLastRow() - 1, sheetFuncionarios.getLastColumn()).getValues();
        const funcionariosFiltrados = todosLosDatos
          .filter(fila => fila[COL_PISO_FUNCIONARIO - 1] == pisoSeleccionado && fila[COL_DIRECCION_FUNCIONARIO - 1] == direccionSeleccionada)
          .map(fila => ({
            id: fila[COL_ID_FUNCIONARIO - 1],
            nombre: fila[COL_NOMBRE_FUNCIONARIO - 1]
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        return funcionariosFiltrados;
      } catch (error) {
        Logger.log(`Error en obtenerFuncionariosPorPisoDireccion (${pisoSeleccionado}, ${direccionSeleccionada}): ${error.message}`);
        return [];
      }
    }

    function obtenerDetallesFuncionario(idFuncionario) {
      try {
        if (!idFuncionario) return null;
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetFuncionarios = ss.getSheetByName(HOJA_FUNCIONARIOS);
        if (!sheetFuncionarios) throw new Error(`Hoja "${HOJA_FUNCIONARIOS}" no encontrada.`);
        const todosLosDatos = sheetFuncionarios.getRange(2, 1, sheetFuncionarios.getLastRow() - 1, sheetFuncionarios.getLastColumn()).getValues();
        const funcionarioEncontrado = todosLosDatos.find(fila => fila[COL_ID_FUNCIONARIO - 1] == idFuncionario);
        if (funcionarioEncontrado) {
          return {
            nombre: funcionarioEncontrado[COL_NOMBRE_FUNCIONARIO - 1],
            piso: funcionarioEncontrado[COL_PISO_FUNCIONARIO - 1],
            direccion: funcionarioEncontrado[COL_DIRECCION_FUNCIONARIO - 1],
            telefono: funcionarioEncontrado[COL_TELEFONO_FUNCIONARIO - 1] || ""
          };
        }
        return null;
      } catch (error) {
        Logger.log(`Error en obtenerDetallesFuncionario (${idFuncionario}): ${error.message}`);
        return null;
      }
    }

    /**
     * NUEVA FUNCIÓN: Obtiene una lista de visitantes que están actualmente dentro.
     * Se basa en la hoja 'Visitas Consolidadas' y busca filas sin Hora de Salida.
     * @return {object[]} Array de objetos {rut: string, nombre: string}.
     */
    function obtenerVisitantesDentro() {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetConsolidada = ss.getSheetByName(HOJA_VISITAS_CONSOLIDADAS);
        if (!sheetConsolidada) {
          Logger.log(`Hoja "${HOJA_VISITAS_CONSOLIDADAS}" no encontrada.`);
          throw new Error(`Hoja "${HOJA_VISITAS_CONSOLIDADAS}" no encontrada.`);
        }

        const lastRow = sheetConsolidada.getLastRow();
        if (lastRow < 2) {
          Logger.log("No hay datos en Visitas Consolidadas.");
          return []; // No hay datos
        }

        // Asegurarse de leer suficientes columnas
        const numColumnas = Math.max(VC_COL_HORA_SALIDA, VC_COL_NOMBRE_VISITANTE, VC_COL_RUT_VISITANTE);
        const rangoDatos = sheetConsolidada.getRange(2, 1, lastRow - 1, numColumnas).getValues();
        
        const visitantesDentro = [];
        for (let i = 0; i < rangoDatos.length; i++) {
          const fila = rangoDatos[i];
          const horaSalida = fila[VC_COL_HORA_SALIDA - 1]; // Col E
          const nombre = fila[VC_COL_NOMBRE_VISITANTE - 1]; // Col G
          const rut = fila[VC_COL_RUT_VISITANTE - 1];       // Col H

          // Si la hora de salida está vacía Y tenemos nombre y RUT, lo consideramos "dentro"
          if ((horaSalida === null || horaSalida === "") && nombre && rut) {
            visitantesDentro.push({
              rut: rut.toString().trim(),
              nombre: nombre.toString().trim()
            });
          }
        }
        // Ordenar por nombre para el desplegable
        visitantesDentro.sort((a, b) => a.nombre.localeCompare(b.nombre));
        Logger.log(`Visitantes Dentro encontrados: ${visitantesDentro.length}`);
        return visitantesDentro;
      } catch (error) {
        Logger.log("Error en obtenerVisitantesDentro: " + error.message + " Stack: " + error.stack);
        return []; // Devuelve array vacío en caso de error
      }
    }


    function guardarRegistro(datosFormulario) {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetRegistros = ss.getSheetByName(HOJA_REGISTROS);
        if (!sheetRegistros) throw new Error(`Hoja "${HOJA_REGISTROS}" no encontrada.`);

        // Si es una salida y se seleccionó un visitante, usar esos datos
        let nombreParaGuardar = datosFormulario.nombreVisitante;
        let rutParaGuardar = datosFormulario.rutVisitante;

        if (datosFormulario.tipoAccion === 'Salida') {
            nombreParaGuardar = datosFormulario.nombreSalida; // Este vendrá del select
            rutParaGuardar = datosFormulario.rutSalida;     // Este vendrá del select (value)
        }

        const nuevaFila = [
          new Date(), 
          datosFormulario.tipoAccion,
          (datosFormulario.tipoAccion === 'Entrada') ? (datosFormulario.esEmpresa || "No") : "", 
          (datosFormulario.tipoAccion === 'Entrada' && datosFormulario.esEmpresa === 'Si') ? (datosFormulario.nombreEmpresa || "") : "",
          (datosFormulario.tipoAccion === 'Entrada') ? nombreParaGuardar : "", // Nombre visitante solo en entrada
          (datosFormulario.tipoAccion === 'Entrada') ? rutParaGuardar : "",    // RUT visitante solo en entrada
          (datosFormulario.tipoAccion === 'Entrada') ? (datosFormulario.correoVisitante || "") : "",
          (datosFormulario.tipoAccion === 'Entrada') ? (datosFormulario.pisoVisitado || "") : "",
          (datosFormulario.tipoAccion === 'Entrada') ? (datosFormulario.direccionVisitada || "") : "",
          (datosFormulario.tipoAccion === 'Entrada') ? (datosFormulario.idFuncionarioVisitado || "") : "",
          (datosFormulario.tipoAccion === 'Entrada') ? (datosFormulario.nombreFuncionarioVisitado || "") : "", 
          (datosFormulario.tipoAccion === 'Entrada') ? (datosFormulario.motivoVisita || "") : "",
          (datosFormulario.tipoAccion === 'Salida') ? rutParaGuardar : "",    // RUT para la columna de salida
          (datosFormulario.tipoAccion === 'Salida') ? nombreParaGuardar : "", // Nombre para la columna de salida
        ];

        sheetRegistros.appendRow(nuevaFila);
        Logger.log("Registro guardado: " + JSON.stringify(datosFormulario));
        return "Registro guardado exitosamente.";
      } catch (error) {
        Logger.log("Error en guardarRegistro: " + error.message + " Datos: " + JSON.stringify(datosFormulario));
        return "Error al guardar el registro: " + error.message;
      }
    }
    