import { useEffect, useState } from "react";
import type { Opportunity } from "../types";
import { SPECIAL, valueLabel } from "../data/catalog";
import { dateLabel } from "../components/ui";
import { absolute, api, hasSession } from "../services/api";
import { bindBackButton, download, hapticSuccess, openExternal, share } from "../integration/max";
export function Details({
  event: e,
  onBack,
  onChange,
  demo = false,
  onGoToCalendar,
}: {
  event: Opportunity;
  onBack: () => void;
  onChange: (event: Opportunity) => void;
  demo?: boolean;
  onGoToCalendar: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => bindBackButton(onBack), [onBack]);
  const going = e.myStatus === "going";
  const fromBackend = e.backendId !== undefined;
  const bool = (v: boolean | undefined) =>
    v === undefined ? "Не указано" : v ? "Да" : "Нет";
  async function participate(status: "going" | "skipped") {
    if (!e.backendId) return;
    if (!hasSession()) {
      setMessage("Откройте приложение из чата с ботом в MAX, чтобы отмечать участие.");
      return;
    }
    setBusy(true);
    try {
      await api.participate(e.backendId, status);
      onChange({ ...e, myStatus: status });
      if (status === "going") {
        hapticSuccess();
        setMessage("Добавили в «Мои даты». Бот напомнит о дедлайне в MAX.");
      } else setMessage("Убрали из «Моих дат», напоминаний не будет.");
    } catch {
      setMessage("Не получилось сохранить участие. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }
  function continueToOpportunity() {
    if (e.hasRegistration && e.goUrl) {
      openExternal(absolute(`${e.goUrl}?src=card`));
      return;
    }
    if (e.source && /^https:\/\//.test(e.source)) {
      openExternal(e.source);
      return;
    }
    setMessage("Ссылка на регистрацию ещё не указана.");
  }
  async function onShare() {
    if (!e.slug || !hasSession()) return;
    try {
      const data = await api.share(e.slug);
      await share(e.title, data.deep_link, data.share_url);
    } catch {
      setMessage("Не получилось подготовить ссылку.");
    }
  }
  return (
    <main className="page event-details">
      <h1>{e.title}</h1>
      <p className="details-organizer">{e.organizer}</p>
      <section className="glass details-card">
        <h2>О ВОЗМОЖНОСТИ</h2>
        <p>{e.description}</p>
        <h3>Что даёт участие</h3>
        <ul>
          {e.results.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <h3>Требования к участникам</h3>
        <p>
          {e.grades.join(", ")} классы · {e.participation}
        </p>
        <p>
          Регионы участников:{" "}
          <em>{e.eligibleRegions.includes("*")
            ? "Все регионы"
            : e.eligibleRegions.join(", ")}</em>
        </p>
        <p>
          Доступно для ОВЗ: <em>{bool(e.accessible)}</em>
          <br />
          Согласие родителей: <em>{bool(e.parentalConsent)}</em>
        </p>
      </section>
      <section className="glass details-card">
        <h2>Когда и где</h2>
        <dl>
          <dt>Формат и место</dt>
          <dd>
            {e.format} · {e.region}
          </dd>
          <dt>Приём заявок</dt>
          <dd>
            {dateLabel(e.opens)} — {dateLabel(e.deadline)}
          </dd>
          <dt>Проведение</dt>
          <dd>
            {dateLabel(e.start)} — {dateLabel(e.end)}
          </dd>
          <dt>Стоимость</dt>
          <dd>
            {e.cost}
            {e.price > 0 ? ` · ${e.price.toLocaleString("ru")} ₽` : ""}
          </dd>
          <dt>Как попасть</dt>
          <dd>{e.admission}</dd>
          <dt>Уровень / организатор</dt>
          <dd>
            {e.level} · {e.organizerType}
          </dd>
          <dt>Направление</dt>
          <dd>{e.direction}</dd>
          <dt>Проверено платформой</dt>
          <dd>{e.verifiedAt ? dateLabel(e.verifiedAt.slice(0, 10)) : bool(e.verified)}</dd>
        </dl>
      </section>
      <section className="glass details-card">
        <h2>Особенности программы</h2>
        <dl>
          {SPECIAL[e.type].map((f) => {
            const v = (
              e.special as unknown as Record<
                string,
                string | number | boolean | undefined
              >
            )[f.key];
            return (
              <div key={f.key}>
                <dt>{f.label}</dt>
                <dd>{v === undefined ? "Не указано" : valueLabel(v)}</dd>
              </div>
            );
          })}
        </dl>
      </section>
      <section className="details-actions" aria-label="Действия с мероприятием">
        {fromBackend && (
          <button
            className={`primary${going ? " is-participating" : ""}`}
            disabled={busy}
            onClick={() => void participate(going ? "skipped" : "going")}
          >
            {going ? "Участвую · отменить" : "Участвую"}
          </button>
        )}
        <button onClick={continueToOpportunity}>Перейти к регистрации</button>
        <button className="details-calendar-link" onClick={onGoToCalendar}>
          Перейти в календарь <span aria-hidden="true">→</span>
        </button>
        <div className="reset-row">
          {e.slug && hasSession() && <button className="text-button" onClick={() => void onShare()}>Поделиться</button>}
          {e.slug && <button className="text-button" onClick={() => download(absolute(`/api/events/${e.slug}.ics`), `${e.slug}.ics`)}>В календарь</button>}
          {demo && hasSession() && e.backendId && <button className="text-button" onClick={() => api.demoReminder(e.backendId!).then(() => setMessage("Напоминание придёт в MAX в течение 30 секунд.")).catch(() => setMessage("Не удалось поставить напоминание."))}>Демо-напоминание</button>}
        </div>
        {message && <p className="details-notice" role="status">{message}</p>}
      </section>
    </main>
  );
}
