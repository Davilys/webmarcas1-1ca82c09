import { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackLpLead } from "@/lib/lpAnalytics";
import { Loader2 } from "lucide-react";

const schema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido. Ex: (11) 98888-7777"),
  brandName: z.string().trim().min(1, "Informe o nome da sua marca").max(80),
});

type FormData = z.infer<typeof schema>;

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const LpLeadForm = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    brandName: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof FormData>(k: K, v: string) => {
    setData((p) => ({ ...p, [k]: k === "phone" ? maskPhone(v) : v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const fe: Partial<Record<keyof FormData, string>> = {};
      parsed.error.errors.forEach((er) => {
        const f = er.path[0] as keyof FormData;
        fe[f] = er.message;
      });
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    try {
      // Cria lead (RLS público permite com nome/email/phone preenchidos)
      const { error } = await supabase.from("leads").insert({
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        company_name: parsed.data.brandName,
        origin: "meta_ads_lp",
        status: "novo",
        notes: `Marca de interesse: ${parsed.data.brandName}`,
      });
      if (error) throw error;

      // Pixel
      trackLpLead({ content_category: "trademark" });

      // Pré-preenche o funil existente em /registrar
      sessionStorage.setItem(
        "lpLead",
        JSON.stringify({
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          brandName: parsed.data.brandName,
        })
      );

      toast.success("Recebemos seus dados! Vamos continuar...");
      navigate("/registrar");
    } catch (err: any) {
      console.error("LP lead error:", err);
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (k: keyof FormData) =>
    `w-full min-h-[52px] px-4 rounded-xl bg-background border ${
      errors[k] ? "border-destructive" : "border-border"
    } text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all`;

  return (
    <section id="lp-form" className="bg-background py-12 md:py-16 scroll-mt-16">
      <div className="max-w-xl mx-auto px-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-2 tracking-tight">
          Comece agora
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-7">
          Leva menos de 3 minutos.
        </p>

        <form onSubmit={onSubmit} noValidate className="space-y-4 bg-card border border-border/60 rounded-2xl p-6 shadow-lg">
          <div>
            <label htmlFor="lp-name" className="block text-sm font-semibold mb-1.5">
              Nome completo ou Razão Social
            </label>
            <input
              id="lp-name"
              type="text"
              autoComplete="name"
              value={data.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className={fieldClass("fullName")}
              style={{ fontSize: 16 }}
              required
            />
            {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="lp-email" className="block text-sm font-semibold mb-1.5">
              E-mail
            </label>
            <input
              id="lp-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              className={fieldClass("email")}
              style={{ fontSize: 16 }}
              required
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="lp-phone" className="block text-sm font-semibold mb-1.5">
              WhatsApp
            </label>
            <input
              id="lp-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="(11) 98888-7777"
              value={data.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={fieldClass("phone")}
              style={{ fontSize: 16 }}
              required
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="lp-brand" className="block text-sm font-semibold mb-1.5">
              Nome da marca que deseja registrar
            </label>
            <input
              id="lp-brand"
              type="text"
              autoComplete="off"
              value={data.brandName}
              onChange={(e) => update("brandName", e.target.value)}
              className={fieldClass("brandName")}
              style={{ fontSize: 16 }}
              required
            />
            {errors.brandName && <p className="text-xs text-destructive mt-1">{errors.brandName}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[56px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[18px] font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
              </>
            ) : (
              <>Quero Proteger Minha Marca →</>
            )}
          </button>

          <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
            Ao continuar, você será contatado pela nossa equipe para dar
            prosseguimento ao processo junto ao INPI.
          </p>
        </form>
      </div>
    </section>
  );
};
