import React from "react";
import { Button, Card } from "../components";
import "./ConsentScreen.css";

interface ConsentScreenProps {
  onAccept: (fullName: string) => Promise<void>;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onAccept }) => {
  const [fullName, setFullName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isFullNameValid = fullName.trim().length > 0;

  const handleAccept = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      await onAccept(fullName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onam kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="consent-screen">
      <div className="consent-screen__content container container--app">
        <Card variant="elevated" padding="lg" className="consent-screen__card">
          <h1 className="consent-screen__title">Bilgilendirme ve Gönüllü Onam Formu</h1>

          <div className="consent-screen__text">
            <p>
              Tarafıma, siroz tanısı bulunan hastaların hepatik ensefalopati açısından
              izlenmesini amaçlayan ve bu doğrultuda geliştirilmiş HETracker (Hepatik
              Ensefalopati İzlem Uygulaması) hakkında ayrıntılı bilgi verilmiştir.
            </p>

            <p>
              Bu uygulamanın amacı; hepatik ensefalopati belirtilerinin erken dönemde fark
              edilmesine yardımcı olmak, semptom takibini kolaylaştırmak ve sağlık
              profesyonelleri ile iletişimi desteklemektir. HETracker bir karar destek ve
              izlem aracıdır; profesyonel tıbbi değerlendirme, teşhis veya tedavinin yerine
              geçmez.
            </p>

            <p>
              Uygulama kapsamında tarafımdan sağlanan verilerin yalnızca bilimsel amaçlarla,
              gizlilik esaslarına uygun olarak değerlendirileceği; kimlik bilgilerimin
              korunacağı ve üçüncü kişilerle paylaşılmayacağı tarafıma açıklanmıştır.
            </p>

            <p>
              Çalışmaya katılımın tamamen gönüllülük esasına dayandığını, istediğim zaman
              herhangi bir gerekçe göstermeksizin uygulama kullanımını bırakabileceğimi ve
              bunun mevcut veya gelecekteki sağlık hizmetlerimi etkilemeyeceğini anladım.
            </p>

            <p>
              Sorularımı sorma ve yeterli açıklama alma fırsatı buldum. Yukarıda belirtilen
              hususları anladığımı beyan eder, kendi özgür irademle katılmayı kabul
              ediyorum.
            </p>

            <div className="consent-screen__name-field">
              <label htmlFor="consent-full-name" className="consent-screen__name-line">
                Adı soyadı :
              </label>
              <input
                id="consent-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ad Soyad"
                autoComplete="name"
              />
            </div>
          </div>

          {error && <p className="consent-screen__error">{error}</p>}

          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAccept}
            disabled={!isFullNameValid}
            loading={isSubmitting}
          >
            Onaylıyorum
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default ConsentScreen;
