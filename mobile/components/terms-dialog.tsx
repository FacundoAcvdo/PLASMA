import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, LogOut, ShieldCheck } from 'lucide-react-native';
import { acceptTerms, logout, me } from '@/lib/auth';
import { onTermsRequired } from '@/lib/terms-events';
import { toast } from '@/lib/toast';
import { useTema } from '@/context/tema-context';
import { FUENTE } from '@/components/ui';

type TermsDialogProps = {
  initialTermsAccepted?: boolean;
};

export function TermsDialog({ initialTermsAccepted = false }: TermsDialogProps) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [aceptadoCheck, setAceptadoCheck] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { colores } = useTema();

  useEffect(() => {
    if (initialTermsAccepted) {
      setMostrarModal(false);
      return;
    }

    if (pathname === '/login') {
      setMostrarModal(false);
      return;
    }

    let cancelado = false;
    me()
      .then((user) => {
        if (cancelado || !user) return;
        if (user.terms_accepted === true) {
          setMostrarModal(false);
        } else {
          setMostrarModal(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [initialTermsAccepted, pathname]);

  useEffect(() => {
    const desuscribir = onTermsRequired(() => {
      if (pathname !== '/login') {
        setMostrarModal(true);
      }
    });
    return desuscribir;
  }, [pathname]);

  async function handleAccept() {
    if (!aceptadoCheck || guardando) return;
    setGuardando(true);
    try {
      await acceptTerms();
      setMostrarModal(false);
      toast.success('Términos y condiciones aceptados.');
      await queryClient.invalidateQueries();
    } catch {
      toast.error('No se pudo registrar la aceptación. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  }

  async function handleDeclineLogout() {
    setCerrandoSesion(true);
    try {
      await logout();
    } catch {}
    setMostrarModal(false);
    setCerrandoSesion(false);
    router.replace('/login');
  }

  if (!mostrarModal) return null;

  return (
    <Modal
      visible={mostrarModal}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxHeight: '92%',
            borderRadius: 20,
            backgroundColor: colores.fondo,
            borderWidth: 1,
            borderColor: colores.borde,
            padding: 18,
            gap: 14,
          }}
        >
          {/* Cabecera */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: colores.primarioFondo,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={22} color={colores.primario} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: FUENTE.semibold,
                  fontSize: 16,
                  color: colores.texto,
                }}
              >
                Términos y Condiciones de Uso — PLASMA
              </Text>
              <Text
                style={{
                  fontFamily: FUENTE.regular,
                  fontSize: 12,
                  color: colores.textoSuave,
                }}
              >
                Plataforma de Lenguaje y Análisis de Salud Mental Automatizado
              </Text>
            </View>
          </View>

          {/* Cuerpo de términos con scroll */}
          <View
            style={{
              maxHeight: 380,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colores.borde,
              backgroundColor: colores.fondoAlt,
              padding: 14,
            }}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
            >
              <Text
                style={{
                  fontFamily: FUENTE.regular,
                  fontSize: 12,
                  lineHeight: 18,
                  color: colores.textoMedio,
                }}
              >
                Bienvenido/a a <Text style={{ fontFamily: FUENTE.semibold }}>PLASMA</Text>. Dado que
                el acceso al sistema es administrado y las cuentas son provistas por un
                administrador, es necesario que lea y acepte el presente acuerdo antes de utilizar la
                plataforma por primera vez.
              </Text>

              {/* Sección 1 */}
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FUENTE.semibold,
                    fontSize: 13,
                    color: colores.texto,
                  }}
                >
                  1. Acceso y Uso de la Cuenta
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  • <Text style={{ fontFamily: FUENTE.semibold }}>Cuentas administradas:</Text> Su
                  cuenta ha sido creada y asignada por un administrador del sistema. Las credenciales
                  de acceso son personales e intransferibles.
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  • <Text style={{ fontFamily: FUENTE.semibold }}>Responsabilidad del usuario:</Text>{' '}
                  Usted es responsable de mantener la confidencialidad de su contraseña y de todas las
                  operaciones, cargas de archivos y análisis ejecutados desde su sesión.
                </Text>
              </View>

              {/* Sección 2 */}
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FUENTE.semibold,
                    fontSize: 13,
                    color: colores.texto,
                  }}
                >
                  2. Tratamiento de Datasets y Capa de Anonimización
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  •{' '}
                  <Text style={{ fontFamily: FUENTE.semibold }}>
                    Recomendación de anonimización previa:
                  </Text>{' '}
                  Se recomienda que los conjuntos de datos (datasets), documentos o historiales de
                  chat cargados en la plataforma se encuentren previamente anonimizados o desprovistos
                  de información personal sensible que no sea necesaria para el análisis.
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  •{' '}
                  <Text style={{ fontFamily: FUENTE.semibold }}>
                    Alcance de la anonimización automática en la ingesta:
                  </Text>{' '}
                  Al cargar un dataset, PLASMA aplica automáticamente una capa de anonimización
                  básica basada en reglas y patrones que:
                </Text>
                <View style={{ paddingLeft: 12, gap: 2 }}>
                  <Text
                    style={{
                      fontFamily: FUENTE.regular,
                      fontSize: 11,
                      lineHeight: 16,
                      color: colores.textoMedio,
                    }}
                  >
                    - Reemplaza nombres o identificadores de remitente/autor por etiquetas genéricas
                    (PERSONA_1, PERSONA_2, etc.).
                  </Text>
                  <Text
                    style={{
                      fontFamily: FUENTE.regular,
                      fontSize: 11,
                      lineHeight: 16,
                      color: colores.textoMedio,
                    }}
                  >
                    - Enmascara emails ([EMAIL]), teléfonos ([TEL]), direcciones IP ([IP]) y enlaces
                    web ([URL]).
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  • <Text style={{ fontFamily: FUENTE.semibold }}>Limitaciones técnicas:</Text> Este
                  proceso automático es una medida de resguardo inicial y no emplea modelos de
                  detección de entidades abiertas (NER). No garantiza la eliminación de datos
                  personales libres o implícitos en los textos.
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  •{' '}
                  <Text style={{ fontFamily: FUENTE.semibold }}>
                    Diccionario de anonimización efímero:
                  </Text>{' '}
                  La plataforma no almacena en su base de datos la correspondencia entre los datos
                  originales y las etiquetas generadas. Dicho diccionario se mantiene temporalmente en
                  memoria únicamente al finalizar la carga para que el usuario pueda descargarlo si lo
                  requiere; luego se elimina definitivamente.
                </Text>
              </View>

              {/* Sección 3 */}
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FUENTE.semibold,
                    fontSize: 13,
                    color: colores.texto,
                  }}
                >
                  3. Uso de Inteligencia Artificial (RAG y Modelado de Tópicos): APIs Externas y Modo
                  Local
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  • <Text style={{ fontFamily: FUENTE.semibold }}>Uso de APIs externas:</Text> En los
                  chatbots de consulta asistidos por inteligencia artificial (sistema RAG) y en la
                  generación automática de títulos del módulo de Modelado de Tópicos, el modo estándar
                  envía las consultas, el historial reciente o los términos y fragmentos
                  representativos a APIs de proveedores externos de modelos de lenguaje (como Groq o
                  Google Gemini) para elaborar las respuestas y etiquetas.
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  •{' '}
                  <Text style={{ fontFamily: FUENTE.semibold }}>
                    Modo Privacidad (Modelo Local):
                  </Text>{' '}
                  Tanto los asistentes de chat como el módulo de Modelado de Tópicos disponen de un
                  interruptor de “Privacidad” (ejecución mediante modelo local Qwen3). Al activar este
                  modo, tanto las consultas como los fragmentos del dataset se procesan íntegramente en
                  la infraestructura local del servidor, sin transmitir información a servicios
                  externos (pudiendo requerir un mayor tiempo de procesamiento). Es responsabilidad
                  del usuario activar el modo local cuando la confidencialidad o sensibilidad de los
                  datos así lo requiera.
                </Text>
              </View>

              {/* Sección 4 */}
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FUENTE.semibold,
                    fontSize: 13,
                    color: colores.texto,
                  }}
                >
                  4. Almacenamiento y Gestión de la Información
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  Para el funcionamiento analítico y la generación de reportes, la plataforma
                  almacena en sus bases de datos: textos procesados anonimizados, metadatos,
                  embeddings vectoriales, resultados analíticos generados, historial de chats y logs
                  técnicos asociados al usuario.
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  • <Text style={{ fontFamily: FUENTE.semibold }}>Control y eliminación:</Text> El
                  usuario puede eliminar en cualquier momento sus datasets, vectores e historiales de
                  conversación desde las secciones de Gestión de Almacenamiento e Historial de Chats.
                </Text>
              </View>

              {/* Sección 5 */}
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FUENTE.semibold,
                    fontSize: 13,
                    color: colores.texto,
                  }}
                >
                  5. Propósito Analítico y Descargo de Responsabilidad Clínica
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  •{' '}
                  <Text style={{ fontFamily: FUENTE.semibold }}>
                    No constituye diagnóstico médico ni psicológico:
                  </Text>{' '}
                  Los resultados generados por PLASMA —en especial los módulos de Emociones, Detección
                  de Menciones de Suicidio y Estimación de Nivel de Riesgo— provienen de modelos
                  estadísticos y de inteligencia artificial experimentales que detectan patrones
                  lingüísticos y pueden contener errores.
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colores.textoMedio,
                  }}
                >
                  • <Text style={{ fontFamily: FUENTE.semibold }}>Supervisión profesional:</Text>{' '}
                  Ningún resultado o informe emitido por la plataforma reemplaza el criterio clínico ni
                  constituye una evaluación de salud mental. Cualquier caso debe ser evaluado por
                  profesionales cualificados.
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* Checkbox de aceptación */}
          <Pressable
            onPress={() => setAceptadoCheck((v) => !v)}
            disabled={guardando || cerrandoSesion}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              padding: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colores.borde,
              backgroundColor: colores.fondoAlt,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: aceptadoCheck ? colores.primario : colores.textoMuted,
                backgroundColor: aceptadoCheck ? colores.primario : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              {aceptadoCheck && <Check size={14} color="#ffffff" />}
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: FUENTE.regular,
                fontSize: 12,
                lineHeight: 18,
                color: colores.texto,
              }}
            >
              He leído y acepto los Términos y Condiciones de Uso de PLASMA. Comprendo el alcance de
              la anonimización automática, el funcionamiento de las APIs externas frente al modo de
              privacidad local en los asistentes y en el modelado de tópicos, y que los resultados del
              sistema son de carácter orientativo y no constituyen diagnóstico clínico.
            </Text>
          </Pressable>

          {/* Botones de acción */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleDeclineLogout}
              disabled={guardando || cerrandoSesion}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colores.borde,
                backgroundColor: colores.fondo,
                opacity: guardando || cerrandoSesion ? 0.6 : 1,
              }}
            >
              {cerrandoSesion ? (
                <ActivityIndicator size="small" color={colores.texto} />
              ) : (
                <LogOut size={16} color={colores.texto} />
              )}
              <Text
                style={{
                  fontFamily: FUENTE.medium,
                  fontSize: 12,
                  color: colores.texto,
                }}
              >
                Rechazar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAccept}
              disabled={!aceptadoCheck || guardando || cerrandoSesion}
              style={{
                flex: 1.4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: colores.primario,
                opacity: !aceptadoCheck || guardando || cerrandoSesion ? 0.5 : 1,
              }}
            >
              {guardando && <ActivityIndicator size="small" color="#ffffff" />}
              <Text
                style={{
                  fontFamily: FUENTE.semibold,
                  fontSize: 12,
                  color: '#ffffff',
                }}
              >
                {guardando ? 'Guardando…' : 'Aceptar y continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
