import React from "react";
import { Link } from "react-router";
import { Button, Card } from "../components";
import "./NotFound.css";

export const NotFound: React.FC = () => {
  return (
    <div className="not-found container container--app">
      <Card variant="outlined" padding="lg" className="not-found__card">
        <p className="not-found__code">404</p>
        <h1 className="not-found__title">Sayfa Bulunamadı</h1>
        <p className="not-found__text">
          Gitmek istediğiniz sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <div className="not-found__actions">
          <Link to="/">
            <Button variant="primary">Ana Sayfa</Button>
          </Link>
          <Link to="/profile">
            <Button variant="secondary">Profile Git</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
