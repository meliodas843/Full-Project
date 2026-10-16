import { useEffect, useMemo, useState } from "react";

import { FiArrowLeft, FiArrowRight, FiCheck, FiImage } from "react-icons/fi";
import { BADGE_OPTIONS, formatPreviewDate, getDatePart, getTimePart, normalizeDateTimeLocalValue, resolvePreview } from "./EventCreateWizard.helpers";
import WizardScheduleStep from "./WizardScheduleStep";
import WizardBasicsStep from "./WizardBasicsStep";


export default function EventCreateWizard({
  editingEventId,

  title,

  setTitle,

  description,

  setDescription,

  badge = "",

  setBadge,

  speakers = [],

  handleSpeakerChange,

  addSpeaker,

  removeSpeaker,

  agendas = [],

  handleAgendaChange,

  addAgendaItem,

  removeAgendaItem,

  handleХөтөлбөрChange,

  addХөтөлбөрItem,

  removeХөтөлбөрItem,

  start_time,

  setStartTime,

  setЭхлэхTime,

  end_time,

  setEndTime,

  setДуусахTime,

  image_url,

  imageFile,

  setImageFile,

  max_participants,

  setMaxParticipants,

  visibility,

  setVisibility,

  creating,

  errMsg,

  setErrMsg,

  successMsg,

  minDateTime,

  resolveUrl,

  getSpeakerAvatar,

  isSvgFile,

  handleCreate,

  closeCreate,
}) {
  const updateAgenda = handleAgendaChange || handleХөтөлбөрChange;

  const addAgenda = addAgendaItem || addХөтөлбөрItem;

  const removeAgenda = removeAgendaItem || removeХөтөлбөрItem;

  const updateStartTime = setStartTime || setЭхлэхTime;

  const updateEndTime = setEndTime || setДуусахTime;

  const [step, setStep] = useState(1);

  const startDateTimeValue = normalizeDateTimeLocalValue(start_time);

  const endDateTimeValue = normalizeDateTimeLocalValue(end_time);

  const minimumDateTimeValue = normalizeDateTimeLocalValue(minDateTime);

  const [localStartDate, setLocalStartDate] = useState(
    getDatePart(startDateTimeValue),
  );

  const [localStartTime, setLocalStartTime] = useState(
    getTimePart(startDateTimeValue),
  );

  const [localEndDate, setLocalEndDate] = useState(
    getDatePart(endDateTimeValue),
  );

  const [localEndTime, setLocalEndTime] = useState(
    getTimePart(endDateTimeValue),
  );

  useEffect(() => {
    const date = getDatePart(startDateTimeValue);

    const time = getTimePart(startDateTimeValue);

    if (date) setLocalStartDate(date);

    if (time) setLocalStartTime(time);
  }, [startDateTimeValue]);

  useEffect(() => {
    const date = getDatePart(endDateTimeValue);

    const time = getTimePart(endDateTimeValue);

    if (date) setLocalEndDate(date);

    if (time) setLocalEndTime(time);
  }, [endDateTimeValue]);

  const [badgeMode, setBadgeMode] = useState("");

  const [customBadge, setCustomBadge] = useState("");

  /*

   * Keep the local badge selector

   * synchronized with the badge

   * received from Event.jsx.

   *

   * This is especially important

   * when editing an existing event.

   */

  useEffect(() => {
    const currentBadge = String(badge || "").trim();

    if (!currentBadge) {
      setBadgeMode("");

      setCustomBadge("");

      return;
    }

    if (BADGE_OPTIONS.some((option) => option.value === currentBadge)) {
      setBadgeMode(currentBadge);

      setCustomBadge("");

      return;
    }

    setBadgeMode("custom");

    setCustomBadge(currentBadge);
  }, [badge]);

  const previewImage = useMemo(
    () => resolvePreview(imageFile, image_url, resolveUrl),

    [imageFile, image_url, resolveUrl],
  );

  /*

   * Single safe function for

   * updating the parent badge.

   */

  function updateBadge(value) {
    if (typeof setBadge !== "function") {
      console.error(
        "EventCreateWizard: setBadge must be passed from Event.jsx.",

        {
          received: setBadge,

          value,
        },
      );

      if (typeof setErrMsg === "function") {
        setErrMsg(
          "Эвентийн төрөл тохируулахад алдаа гарлаа. Event.jsx дээр setBadge prop дамжуулсан эсэхийг шалгана уу.",
        );
      }

      return false;
    }

    setBadge(value);

    return true;
  }

  function handleBadgeSelect(event) {
    const value = event.target.value;

    setBadgeMode(value);

    if (typeof setErrMsg === "function") {
      setErrMsg("");
    }

    if (!value) {
      setCustomBadge("");

      updateBadge("");

      return;
    }

    if (value === "custom") {
      updateBadge(customBadge.trim());

      return;
    }

    setCustomBadge("");

    updateBadge(value);
  }

  function handleCustomBadge(event) {
    const value = event.target.value;

    setCustomBadge(value);

    if (typeof setErrMsg === "function") {
      setErrMsg("");
    }

    updateBadge(value);
  }

  function validateStepOne() {
    if (!title?.trim()) {
      setErrMsg?.("Эвентийн гарчгийг оруулна уу.");

      return false;
    }

    if (badgeMode === "custom" && !customBadge.trim()) {
      setErrMsg?.("Төрлийн нэрийг оруулна уу.");

      return false;
    }

    if (!badge?.trim()) {
      setErrMsg?.("Эвентийн төрлийг сонгох эсвэл оруулна уу.");

      return false;
    }

    setErrMsg?.("");

    return true;
  }

  function validateStepTwo() {
    if (!start_time) {
      setErrMsg?.("Эхлэх огноо, цагийг сонгоно уу.");

      return false;
    }

    if (
      end_time &&
      new Date(end_time).getTime() < new Date(start_time).getTime()
    ) {
      setErrMsg?.("Дуусах хугацаа эхлэх хугацаанаас өмнө байж болохгүй.");

      return false;
    }

    setErrMsg?.("");

    return true;
  }

  function nextStep() {
    if (step === 1 && !validateStepOne()) {
      return;
    }

    if (step === 2 && !validateStepTwo()) {
      return;
    }

    setStep((current) => Math.min(3, current + 1));

    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });
  }

  function previousStep() {
    setErrMsg?.("");

    setStep((current) => Math.max(1, current - 1));

    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });
  }

  function submitEvent(event) {
    if (!validateStepOne()) {
      event.preventDefault();

      setStep(1);

      return;
    }

    if (!validateStepTwo()) {
      event.preventDefault();

      setStep(2);

      return;
    }

    if (typeof handleCreate === "function") {
      handleCreate(event);
    }
  }

  return (
    <div
      className="eventWizard"
      style={{
        width: "100%",

        maxWidth: "none",

        margin: 0,
      }}
    >
      <div className="eventWizardHeader">
        <button type="button" className="eventWizardBack" onClick={closeCreate}>
          <FiArrowLeft />
        </button>

        <div>
          <h2>{editingEventId ? "Эвент засах" : "Эвент үүсгэх"}</h2>

          <p>
            3 алхмын {step}-р алхам
            {" — "}
            {step === 1
              ? "Үндсэн мэдээлэл"
              : step === 2
                ? "Огноо ба дэлгэрэнгүй"
                : "Урьдчилан харах ба нийтлэх"}
          </p>
        </div>
      </div>

      <div className="eventWizardSteps">
        <div
          className={`eventWizardStep ${step >= 1 ? "active" : ""} ${
            step > 1 ? "completed" : ""
          }`}
        >
          <span>{step > 1 ? <FiCheck /> : "1"}</span>

          <strong>Үндсэн мэдээлэл</strong>
        </div>

        <div className={`eventWizardLine ${step >= 2 ? "active" : ""}`} />

        <div
          className={`eventWizardStep ${step >= 2 ? "active" : ""} ${
            step > 2 ? "completed" : ""
          }`}
        >
          <span>{step > 2 ? <FiCheck /> : "2"}</span>

          <strong>Огноо ба дэлгэрэнгүй</strong>
        </div>

        <div className={`eventWizardLine ${step >= 3 ? "active" : ""}`} />

        <div className={`eventWizardStep ${step >= 3 ? "active" : ""}`}>
          <span>3</span>

          <strong>Урьдчилан харах ба нийтлэх</strong>
        </div>
      </div>

      <form className="eventWizardForm" onSubmit={submitEvent}>
        {step === 1 && (
          <WizardBasicsStep
            badgeMode={badgeMode}
            customBadge={customBadge}
            description={description}
            handleBadgeSelect={handleBadgeSelect}
            handleCustomBadge={handleCustomBadge}
            imageFile={imageFile}
            image_url={image_url}
            isSvgFile={isSvgFile}
            resolveUrl={resolveUrl}
            setDescription={setDescription}
            setErrMsg={setErrMsg}
            setImageFile={setImageFile}
            setTitle={setTitle}
            setVisibility={setVisibility}
            title={title}
            visibility={visibility}
          />
        )}

        {step === 2 && (
          <WizardScheduleStep
            addAgenda={addAgenda}
            addSpeaker={addSpeaker}
            agendas={agendas}
            editingEventId={editingEventId}
            endDateTimeValue={endDateTimeValue}
            getSpeakerAvatar={getSpeakerAvatar}
            handleSpeakerChange={handleSpeakerChange}
            isSvgFile={isSvgFile}
            localEndDate={localEndDate}
            localEndTime={localEndTime}
            localStartDate={localStartDate}
            localStartTime={localStartTime}
            max_participants={max_participants}
            minimumDateTimeValue={minimumDateTimeValue}
            removeAgenda={removeAgenda}
            removeSpeaker={removeSpeaker}
            resolveUrl={resolveUrl}
            setErrMsg={setErrMsg}
            setLocalEndDate={setLocalEndDate}
            setLocalEndTime={setLocalEndTime}
            setLocalStartDate={setLocalStartDate}
            setLocalStartTime={setLocalStartTime}
            setMaxParticipants={setMaxParticipants}
            speakers={speakers}
            startDateTimeValue={startDateTimeValue}
            updateAgenda={updateAgenda}
            updateEndTime={updateEndTime}
            updateStartTime={updateStartTime}
          />
        )}

        {step === 3 && (
          <>
            <div className="eventWizardPreview">
              <div className="eventWizardPreviewHero">
                {previewImage ? (
                  <img src={previewImage} alt={title || "Эвент"} />
                ) : (
                  <div className="eventWizardPreviewPlaceholder">
                    <FiImage />
                  </div>
                )}

                <div className="eventWizardPreviewOverlay">
                  <div
                    style={{
                      display: "flex",

                      alignItems: "center",

                      gap: 8,

                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      {visibility === "private" ? "Хаалттай" : "Нийтийн"}
                    </span>

                    {badge?.trim() ? <span>{badge.trim()}</span> : null}
                  </div>

                  <h2>{title?.trim() || "Нэргүй эвент"}</h2>
                </div>
              </div>

              <div className="eventWizardPreviewGrid">
                <div>
                  <small>Эхлэх</small>

                  <strong>{formatPreviewDate(start_time)}</strong>
                </div>

                <div>
                  <small>Дуусах</small>

                  <strong>
                    {end_time ? formatPreviewDate(end_time) : "Тодорхойгүй"}
                  </strong>
                </div>

                <div>
                  <small>Багтаамж</small>

                  <strong>
                    {max_participants
                      ? `${max_participants} хүн`
                      : "Хязгааргүй"}
                  </strong>
                </div>

                <div>
                  <small>Харагдах байдал</small>

                  <strong>
                    {visibility === "private" ? "Хаалттай" : "Нийтийн"}
                  </strong>
                </div>

                <div>
                  <small>Төрөл</small>

                  <strong>{badge?.trim() || "Тодорхойгүй"}</strong>
                </div>
              </div>

              {description ? (
                <div className="eventWizardPreviewDescription">
                  <small>Тайлбар</small>

                  <p>{description}</p>
                </div>
              ) : null}
            </div>

            {!title?.trim() || !badge?.trim() || !start_time ? (
              <div className="eventWizardWarning">
                Эвентээ нийтлэхийн өмнө эвентийн нэрийг оруулж, тэмдэг (badge) сонгон, эхлэх огноо болон цагийг тохируулна уу.
              </div>
            ) : null}
          </>
        )}

        {errMsg ? <div className="eventWizardError">{errMsg}</div> : null}

        {successMsg ? (
          <div className="eventWizardSuccess">{successMsg}</div>
        ) : null}

        <div className="eventWizardActions">
          {step > 1 ? (
            <button
              type="button"
              className="eventWizardPrevious"
              onClick={previousStep}
              disabled={creating}
            >
              <FiArrowLeft />
              Өмнөх
            </button>
          ) : (
            <button
              type="button"
              className="eventWizardPrevious"
              onClick={closeCreate}
              disabled={creating}
            >
              Цуцлах
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              className="eventWizardContinue"
              onClick={nextStep}
              disabled={creating}
            >
              Үргэлжлүүлэх
              <FiArrowRight />
            </button>
          )}

          {step === 2 && (
            <div
              style={{
                display: "flex",

                alignItems: "center",

                gap: 12,

                marginLeft: "auto",
              }}
            >
              <button
                type="button"
                className="eventWizardDraft"
                disabled={creating}
                onClick={(event) => {
                  event.preventDefault();

                  if (!validateStepOne()) {
                    setStep(1);

                    return;
                  }

                  if (typeof handleCreate === "function") {
                    handleCreate(event, "draft");
                  }
                }}
              >
                {creating ? "Хадгалж байна..." : "Draft"}
              </button>

              <button
                type="button"
                className="eventWizardContinue"
                disabled={
                  creating || !title?.trim() || !badge?.trim() || !start_time
                }
                onClick={(event) => {
                  event.preventDefault();

                  if (!validateStepOne()) {
                    setStep(1);

                    return;
                  }

                  if (!validateStepTwo()) {
                    setStep(2);

                    return;
                  }

                  if (typeof handleCreate === "function") {
                    handleCreate(event, "published");
                  }
                }}
              >
                {creating
                  ? editingEventId
                    ? "Хадгалж байна..."
                    : "Нийтэлж байна..."
                  : editingEventId
                    ? "Өөрчлөлт хадгалах"
                    : "Нийтлэх"}

                <FiArrowRight />
              </button>
            </div>
          )}

          {step === 3 && (
            <button
              type="submit"
              className="eventWizardContinue"
              disabled={
                creating || !title?.trim() || !badge?.trim() || !start_time
              }
            >
              {creating
                ? editingEventId
                  ? "Хадгалж байна..."
                  : "Нийтэлж байна..."
                : editingEventId
                  ? "Өөрчлөлт хадгалах"
                  : "Нийтлэх"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
