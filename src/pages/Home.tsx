import React from "react";
import { Link } from "react-router";
import { Card, Button } from "../components";
import "./Home.css";

export const Home: React.FC = () => {
  return (
    <div className="home container container--app">
      <header className="home__header">
        <h1 className="home__title">HETracker Uygulaması</h1>
        <p className="home__subtitle">
          Dikkat, reaksiyon ve hafıza becerilerinizi ölçen testler
        </p>
      </header>

      <div className="home__info">
        <Card variant="elevated" padding="lg" className="info-card">
          <div className="info-card__icon">ℹ️</div>
          <h2 className="info-card__title">Hasta Yakını Bilgilendirme Notu</h2>
          <div className="info-card__body">
            <p>
              Lütfen testi sessiz ve dikkat dağıtıcı olmayan bir ortamda
              hastanıza uygulayınız.
            </p>
            <p>
              Test sırasında hastaya yardım etmeyiniz, cevapları söylemeyiniz
              veya yönlendirme yapmayınız.
            </p>
            <p>
              Amaç hastayı sınamak değil, dikkat ve hafıza durumunu düzenli
              takip etmektir.
            </p>
          </div>
        </Card>
      </div>

      <div className="home__actions">
        <Link to="/test" className="home__action-link">
          <Button variant="primary" size="lg" fullWidth>
            Teste Başla
          </Button>
        </Link>
        {/* <Link to="/results" className="home__action-link">
          <Button variant="secondary" size="lg" fullWidth>
            Sonuçları Görüntüle
          </Button>
        </Link> */}
      </div>
    </div>
  );
};

export default Home;
