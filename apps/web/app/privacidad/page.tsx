import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fetchContenido, texto } from "@/lib/content";
import { BRAND_NAME, pageSocial } from "@/lib/site";

const PRIVACY_TITLE = "Política de tratamiento de datos personales";
const PRIVACY_DESCRIPTION =
  "Política de tratamiento de datos personales de OrthoPro Lab, laboratorio dental en Medellín.";

export const metadata: Metadata = {
  title: PRIVACY_TITLE,
  description: PRIVACY_DESCRIPTION,
  // The bracketed placeholders are still unfilled (S7), so the page stays out of
  // the index and is not listed in the sitemap.
  robots: { index: false },
  ...pageSocial(`${PRIVACY_TITLE} | ${BRAND_NAME}`, PRIVACY_DESCRIPTION, "/privacidad"),
};

// The page body awaits the cached content before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 mb-2.5 font-heading text-[26px] font-semibold text-body">{children}</h2>;
}

const LIST = "mt-0 list-disc space-y-1.5 pl-[22px] text-body/85";

export default async function PrivacyPage() {
  const contenido = await fetchContenido();
  // Every placeholder the design leaves open is its own key, brackets included,
  // so an administrator fills one field instead of retyping a paragraph.
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);
  const fecha = t("privacidad.fecha", "[FECHA]");
  const razonSocial = t("privacidad.razon_social", "[RAZÓN SOCIAL Y NIT]");
  const correo = t("privacidad.correo", "[CORREO]");
  const telefono = t("privacidad.telefono", "[TELÉFONO]");
  const cargo = t("privacidad.cargo", "[CARGO / ÁREA]");
  const otrasFinalidades = t(
    "privacidad.otras_finalidades",
    "[Otras finalidades, si existen, como informar novedades del laboratorio: solo con una autorización aparte.]",
  );
  const otrosEncargados = t(
    "privacidad.otros_encargados",
    "[Otros encargados, como el proveedor donde guardamos los contactos, y su país: completar.]",
  );

  return (
    <article className="mx-auto max-w-[760px] px-6 pt-18 pb-28">
      <h1 className="mb-3 text-[clamp(2.25rem,4.6vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.04em] text-balance text-body">
        {PRIVACY_TITLE}
      </h1>
      <p className="mb-10 text-surface-alt">
        Vigente desde: {fecha}. Borrador pendiente de revisión legal.
      </p>

      <H2>Quién es el responsable</H2>
      <p className="text-body/85">
        {BRAND_NAME}, {razonSocial}. Domicilio y dirección: Cl. 53 #43 - 43, oficina 204, Medellín,
        Antioquia. Correo: {correo}. Teléfono: {telefono}.
      </p>

      <H2>Qué datos recogemos</H2>
      {/* The design describes a form and a consent checkbox the site does not
          have (S6 dropped the lead form, so this page has none). The paragraph
          is a key so the client can correct it without a deploy. */}
      <p className="text-body/85">
        {t(
          "privacidad.datos.texto",
          "Tu nombre, que escribes en el formulario de esta página, y tu número de WhatsApp, que recibimos cuando nos escribes. No pedimos datos sensibles ni datos de menores de edad. Si algún día los pidiéramos, responder sería voluntario.",
        )}
      </p>

      <H2>Para qué los usamos</H2>
      <ul className={LIST}>
        <li>Responder tu mensaje y coordinar cómo recibimos las impresiones de tu caso.</li>
        <li>Guardar tu contacto para dar seguimiento a tu solicitud y a tus casos.</li>
        <li>{otrasFinalidades}</li>
      </ul>

      <H2>Tu autorización</H2>
      <p className="text-body/85">
        {t(
          "privacidad.autorizacion.texto",
          "Antes de abrir WhatsApp te pedimos marcar una casilla de autorización. Sin ella no enviamos el formulario. Guardamos constancia de cuándo la diste y de la versión de esta política que viste.",
        )}{" "}
        Puedes revocarla cuando quieras escribiendo a {correo}; borraremos tus datos, salvo los que
        la ley o un contrato nos obliguen a conservar.
      </p>

      <H2>Tus derechos</H2>
      <p className="mb-2.5 text-body/85">Según la Ley 1581 de 2012 puedes:</p>
      <ul className={LIST}>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de tu autorización.</li>
        <li>Saber cómo usamos tus datos.</li>
        <li>Consultar tus datos sin costo.</li>
        <li>Revocar la autorización y pedir que borremos tus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
      </ul>

      <H2>Cómo ejercer tus derechos</H2>
      <p className="text-body/85">
        La persona responsable de atender consultas y reclamos es {cargo}. Escribe a {correo} o
        llama al {telefono}.
      </p>
      <ul className={`${LIST} mt-3.5`}>
        <li>
          <strong>Consultas:</strong> las respondemos en máximo 10 días hábiles. Si necesitamos más
          tiempo, te avisamos el motivo y la fecha, que no pasará de 5 días hábiles adicionales.
        </li>
        <li>
          <strong>Reclamos</strong> (corregir, actualizar, borrar o revocar): incluye tu nombre, la
          descripción de los hechos y una dirección donde contactarte. Si falta algo, te lo pedimos
          dentro de los 5 días siguientes. Respondemos en máximo 15 días hábiles, con una prórroga de
          hasta 8 días hábiles si te explicamos el motivo.
        </li>
      </ul>

      <H2>Con quién compartimos tus datos</H2>
      <p className="text-body/85">
        Tus mensajes pasan por WhatsApp (Meta), cuyos servidores pueden estar fuera de Colombia.{" "}
        {otrosEncargados}
      </p>

      <H2>Cuánto tiempo los guardamos</H2>
      <p className="mb-2.5 text-body/85">
        Guardamos tus datos solo el tiempo necesario para las finalidades que te informamos. Cuando se
        cumplen, los borramos.
      </p>
      <ul className={LIST}>
        <li>
          <strong>Si solo nos escribiste y no enviaste un caso:</strong> borramos tu nombre y tu número
          12 meses después de tu último mensaje.
        </li>
        <li>
          <strong>Si eres cliente:</strong> conservamos los datos de tus casos y los soportes de
          facturación y pago durante 10 años desde el último documento, porque la ley comercial nos
          obliga a guardarlos.
        </li>
        <li>
          <strong>Si pides que borremos tus datos:</strong> lo hacemos, salvo los que la ley o un
          contrato nos obliguen a conservar.
        </li>
      </ul>

      <H2>Seguridad</H2>
      <p className="text-body/85">
        Protegemos tus datos con medidas técnicas y administrativas para evitar su pérdida, consulta o
        uso no autorizado. Solo accede a ellos el personal de OrthoPro Lab que los necesita para
        atenderte.
      </p>

      <H2>Vigencia y cambios</H2>
      <p className="text-body/85">
        Esta política rige desde {fecha}. La base de datos de contactos se mantiene mientras sea
        necesaria para las finalidades descritas y por los plazos de conservación indicados arriba. Si
        hacemos un cambio sustancial, te lo informaremos antes de aplicarlo.
      </p>
    </article>
  );
}
