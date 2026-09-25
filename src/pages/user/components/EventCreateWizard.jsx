import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiEye,
  FiImage,
  FiLock,
  FiPlus,
  FiTag,
  FiTrash2,
  FiUploadCloud,
  FiUsers,
} from "react-icons/fi";

const BADGE_OPTIONS = [
  { value: "Technology", label: "Технологи" },
  { value: "Business", label: "Бизнес" },
  { value: "Education", label: "Боловсрол" },
  { value: "Conference", label: "Хурал, конференц" },
  { value: "Workshop", label: "Сургалт" },
  { value: "Networking", label: "Танилцах, харилцаа холбоо" },
  { value: "Community", label: "Нийгэмлэг" },
  { value: "Sports", label: "Спорт" },
  { value: "Entertainment", label: "Энтертайнмент" },
];

function resolvePreview(
  imageFile,
  imageUrl,
  resolveUrl
) {
  if (
    typeof File !== "undefined" &&
    imageFile instanceof File
  ) {
    return URL.createObjectURL(
      imageFile
    );
  }

  if (
    imageUrl &&
    typeof resolveUrl ===
      "function"
  ) {
    return resolveUrl(
      imageUrl
    );
  }

  return "";
}

function normalizeDateTimeLocalValue(value) {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 16);
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDatePart(value) {
  const normalized = normalizeDateTimeLocalValue(value);
  return normalized ? normalized.slice(0, 10) : "";
}

function getTimePart(value) {
  const normalized = normalizeDateTimeLocalValue(value);
  return normalized ? normalized.slice(11, 16) : "";
}

function combineDateAndTime(date, time) {
  if (!date) return "";
  return `${date}T${time || "09:00"}`;
}

function formatPreviewDate(
  value
) {
  if (!value) {
    return "Тодорхойгүй";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "mn-MN",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

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
  const updateAgenda =
    handleAgendaChange || handleХөтөлбөрChange;

  const addAgenda =
    addAgendaItem || addХөтөлбөрItem;

  const removeAgenda =
    removeAgendaItem || removeХөтөлбөрItem;

  const updateStartTime =
    setStartTime || setЭхлэхTime;

  const updateEndTime =
    setEndTime || setДуусахTime;

  const [step, setStep] =
    useState(1);

  const startDateTimeValue =
    normalizeDateTimeLocalValue(start_time);

  const endDateTimeValue =
    normalizeDateTimeLocalValue(end_time);

  const minimumDateTimeValue =
    normalizeDateTimeLocalValue(minDateTime);

  const [localStartDate, setLocalStartDate] = useState(
    getDatePart(startDateTimeValue)
  );
  const [localStartTime, setLocalStartTime] = useState(
    getTimePart(startDateTimeValue)
  );
  const [localEndDate, setLocalEndDate] = useState(
    getDatePart(endDateTimeValue)
  );
  const [localEndTime, setLocalEndTime] = useState(
    getTimePart(endDateTimeValue)
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

  const [
    badgeMode,
    setBadgeMode,
  ] = useState("");

  const [
    customBadge,
    setCustomBadge,
  ] = useState("");

  /*
   * Keep the local badge selector
   * synchronized with the badge
   * received from Event.jsx.
   *
   * This is especially important
   * when editing an existing event.
   */
  useEffect(() => {
    const currentBadge =
      String(
        badge || ""
      ).trim();

    if (!currentBadge) {
      setBadgeMode("");
      setCustomBadge("");
      return;
    }

    if (
      BADGE_OPTIONS.some(
        (option) =>
          option.value === currentBadge
      )
    ) {
      setBadgeMode(
        currentBadge
      );

      setCustomBadge("");

      return;
    }

    setBadgeMode("custom");

    setCustomBadge(
      currentBadge
    );
  }, [badge]);

  const previewImage =
    useMemo(
      () =>
        resolvePreview(
          imageFile,
          image_url,
          resolveUrl
        ),
      [
        imageFile,
        image_url,
        resolveUrl,
      ]
    );

  /*
   * Single safe function for
   * updating the parent badge.
   */
  function updateBadge(
    value
  ) {
    if (
      typeof setBadge !==
      "function"
    ) {
      console.error(
        "EventCreateWizard: setBadge must be passed from Event.jsx.",
        {
          received:
            setBadge,
          value,
        }
      );

      if (
        typeof setErrMsg ===
        "function"
      ) {
        setErrMsg(
          "Эвентийн төрөл тохируулахад алдаа гарлаа. Event.jsx дээр setBadge prop дамжуулсан эсэхийг шалгана уу."
        );
      }

      return false;
    }

    setBadge(value);

    return true;
  }

  function handleBadgeSelect(
    event
  ) {
    const value =
      event.target.value;

    setBadgeMode(value);

    if (
      typeof setErrMsg ===
      "function"
    ) {
      setErrMsg("");
    }

    if (!value) {
      setCustomBadge("");
      updateBadge("");
      return;
    }

    if (
      value === "custom"
    ) {
      updateBadge(
        customBadge.trim()
      );

      return;
    }

    setCustomBadge("");

    updateBadge(value);
  }

  function handleCustomBadge(
    event
  ) {
    const value =
      event.target.value;

    setCustomBadge(value);

    if (
      typeof setErrMsg ===
      "function"
    ) {
      setErrMsg("");
    }

    updateBadge(value);
  }

  function validateStepOne() {
    if (!title?.trim()) {
      setErrMsg?.(
        "Эвентийн гарчгийг оруулна уу."
      );

      return false;
    }

    if (
      badgeMode ===
        "custom" &&
      !customBadge.trim()
    ) {
      setErrMsg?.(
        "Төрлийн нэрийг оруулна уу."
      );

      return false;
    }

    if (!badge?.trim()) {
      setErrMsg?.(
        "Эвентийн төрлийг сонгох эсвэл оруулна уу."
      );

      return false;
    }

    setErrMsg?.("");

    return true;
  }

  function validateStepTwo() {
    if (!start_time) {
      setErrMsg?.(
        "Эхлэх огноо, цагийг сонгоно уу."
      );

      return false;
    }

    if (
      end_time &&
      new Date(
        end_time
      ).getTime() <
        new Date(
          start_time
        ).getTime()
    ) {
      setErrMsg?.(
        "Дуусах хугацаа эхлэх хугацаанаас өмнө байж болохгүй."
      );

      return false;
    }

    setErrMsg?.("");

    return true;
  }

  function nextStep() {
    if (
      step === 1 &&
      !validateStepOne()
    ) {
      return;
    }

    if (
      step === 2 &&
      !validateStepTwo()
    ) {
      return;
    }

    setStep(
      (current) =>
        Math.min(
          3,
          current + 1
        )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function previousStep() {
    setErrMsg?.("");

    setStep(
      (current) =>
        Math.max(
          1,
          current - 1
        )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function submitEvent(
    event
  ) {
    if (
      !validateStepOne()
    ) {
      event.preventDefault();

      setStep(1);

      return;
    }

    if (
      !validateStepTwo()
    ) {
      event.preventDefault();

      setStep(2);

      return;
    }

    if (
      typeof handleCreate ===
      "function"
    ) {
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
        <button
          type="button"
          className="eventWizardBack"
          onClick={
            closeCreate
          }
        >
          <FiArrowLeft />
        </button>

        <div>
          <h2>
            {editingEventId
              ? "Эвент засах"
              : "Эвент үүсгэх"}
          </h2>

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
          className={`eventWizardStep ${
            step >= 1
              ? "active"
              : ""
          } ${
            step > 1
              ? "completed"
              : ""
          }`}
        >
          <span>
            {step > 1 ? (
              <FiCheck />
            ) : (
              "1"
            )}
          </span>

          <strong>
            Үндсэн мэдээлэл
          </strong>
        </div>

        <div
          className={`eventWizardLine ${
            step >= 2
              ? "active"
              : ""
          }`}
        />

        <div
          className={`eventWizardStep ${
            step >= 2
              ? "active"
              : ""
          } ${
            step > 2
              ? "completed"
              : ""
          }`}
        >
          <span>
            {step > 2 ? (
              <FiCheck />
            ) : (
              "2"
            )}
          </span>

          <strong>
            Огноо ба дэлгэрэнгүй
          </strong>
        </div>

        <div
          className={`eventWizardLine ${
            step >= 3
              ? "active"
              : ""
          }`}
        />

        <div
          className={`eventWizardStep ${
            step >= 3
              ? "active"
              : ""
          }`}
        >
          <span>
            3
          </span>

          <strong>
            Урьдчилан харах ба нийтлэх
          </strong>
        </div>
      </div>

      <form
        className="eventWizardForm"
        onSubmit={
          submitEvent
        }
      >
        {step === 1 && (
          <div className="eventWizardPanel">
            <label className="eventWizardField">
              <span>
                ЭВЕНТИЙН НЭР *
              </span>

              <input
                value={
                  title || ""
                }
                onChange={(
                  event
                ) =>
                  setTitle?.(
                    event.target
                      .value
                  )
                }
                placeholder="Жишээ: Tech Summit 2026"
              />
            </label>

            <label className="eventWizardField">
              <span>
                ЭВЕНТИЙН ТӨРӨЛ *
              </span>

              <div className="eventWizardSelectIcon">
                <FiTag />

                <select
                  value={
                    badgeMode
                  }
                  onChange={
                    handleBadgeSelect
                  }
                >
                  <option value="">
                    Төрөл сонгох
                  </option>

                  {BADGE_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}

                  <option value="custom">
                    Бусад / Өөрөө оруулах
                  </option>
                </select>
              </div>
            </label>

            {badgeMode ===
              "custom" && (
              <label className="eventWizardField">
                <span>
                  БУСАД ТӨРӨЛ *
                </span>

                <div className="eventWizardInputIcon">
                  <FiTag />

                  <input
                    type="text"
                    value={
                      customBadge
                    }
                    onChange={
                      handleCustomBadge
                    }
                    placeholder="Жишээ: Кибер аюулгүй байдал"
                    maxLength={
                      40
                    }
                    autoFocus
                  />
                </div>

                <small
                  style={{
                    display:
                      "block",
                    marginTop: 6,
                    opacity: 0.65,
                  }}
                >
                  Can't find the
                  right badge? Write
                  your own.
                </small>
              </label>
            )}

            <label className="eventWizardField">
              <span>
                ХАРАГДАХ БАЙДАЛ
              </span>

              <div className="eventWizardSelectIcon">
                {visibility ===
                "private" ? (
                  <FiLock />
                ) : (
                  <FiEye />
                )}

                <select
                  value={
                    visibility ||
                    "public"
                  }
                  onChange={(
                    event
                  ) =>
                    setVisibility?.(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="public">
                    Нийтийн эвент
                  </option>

                  <option value="private">
                    Хаалттай эвент
                  </option>
                </select>
              </div>
            </label>

            <label className="eventWizardField">
              <span>
                ДЭЛГЭРЭНГҮЙ ТАЙЛБАР
              </span>

              <textarea
                value={
                  description ||
                  ""
                }
                onChange={(
                  event
                ) =>
                  setDescription?.(
                    event.target
                      .value
                  )
                }
                placeholder="Эвентийн тайлбарыг оруулна уу..."
                rows={6}
              />
            </label>

            <div className="eventWizardField">
              <span>
                НҮҮР ЗУРАГ ОРУУЛАХ
              </span>

              <label className="eventWizardUpload">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif"
                  onChange={(
                    event
                  ) => {
                    const file =
                      event.target
                        .files?.[0] ||
                      null;

                    if (!file) {
                      setImageFile?.(
                        null
                      );

                      return;
                    }

                    if (
                      typeof isSvgFile ===
                        "function" &&
                      isSvgFile(file)
                    ) {
                      setErrMsg?.(
                        "SVG зураг дэмжигдэхгүй."
                      );

                      setImageFile?.(
                        null
                      );

                      event.target.value =
                        "";

                      return;
                    }

                    setErrMsg?.("");

                    setImageFile?.(
                      file
                    );
                  }}
                />

                <FiUploadCloud />

                <div>
                  <strong>
                    {imageFile
                      ? imageFile.name
                      : image_url
                        ? "Шинэ нүүр зураг сонгох"
                        : "Нүүр зураг сонгох"}
                  </strong>

                  <small>
                    PNG, JPG,
                    JPEG, WEBP,
                    GIF
                  </small>
                </div>
              </label>

              {image_url &&
              !imageFile ? (
                <div
                  style={{
                    marginTop:
                      12,
                    width:
                      "100%",
                    height:
                      180,
                    borderRadius:
                      12,
                    overflow:
                      "hidden",
                  }}
                >
                  <img
                    src={
                      typeof resolveUrl ===
                      "function"
                        ? resolveUrl(
                            image_url
                          )
                        : image_url
                    }
                    alt="Одоогийн нүүр зураг"
                    style={{
                      width:
                        "100%",
                      height:
                        "100%",
                      objectFit:
                        "cover",
                      display:
                        "block",
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="eventWizardPanel">
            <div className="eventWizardTwoColumns">
              <label className="eventWizardField">
                <span>
                  ЭХЛЭХ ОГНОО, ЦАГ *
                </span>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 150px",
                    gap: 10,
                  }}
                >
                  <div className="eventWizardInputIcon">
                    <FiCalendar />

                    <input
                      type="date"
                      value={localStartDate}
                      min={
                        editingEventId
                          ? undefined
                          : getDatePart(minimumDateTimeValue) || undefined
                      }
                      onChange={(event) => {
                        const date = event.target.value;
                        setLocalStartDate(date);

                        if (!date) {
                          setLocalStartTime("");
                          setLocalEndDate("");
                          setLocalEndTime("");
                          updateStartTime?.("");
                          updateEndTime?.("");
                          return;
                        }

                        const time = localStartTime || "09:00";

                        if (!localStartTime) {
                          setLocalStartTime(time);
                        }

                        const value = combineDateAndTime(date, time);

                        setErrMsg?.("");
                        updateStartTime?.(value);

                        if (
                          endDateTimeValue &&
                          endDateTimeValue < value
                        ) {
                          setLocalEndDate("");
                          setLocalEndTime("");
                          updateEndTime?.("");
                        }
                      }}
                    />
                  </div>

                  <input
                    type="time"
                    step="60"
                    value={localStartTime}
                    onChange={(event) => {
                      const time = event.target.value;
                      setLocalStartTime(time);

                      if (!localStartDate || !time) {
                        return;
                      }

                      const value = combineDateAndTime(
                        localStartDate,
                        time
                      );

                      setErrMsg?.("");
                      updateStartTime?.(value);

                      if (
                        endDateTimeValue &&
                        endDateTimeValue < value
                      ) {
                        setLocalEndDate("");
                        setLocalEndTime("");
                        updateEndTime?.("");
                      }
                    }}
                  />
                </div>
              </label>

              <label className="eventWizardField">
                <span>
                  ДУУСАХ ОГНОО, ЦАГ
                </span>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 150px",
                    gap: 10,
                  }}
                >
                  <div className="eventWizardInputIcon">
                    <FiCalendar />

                    <input
                      type="date"
                      value={localEndDate}
                      min={localStartDate || undefined}
                      disabled={!localStartDate}
                      onChange={(event) => {
                        const date = event.target.value;
                        setLocalEndDate(date);

                        if (!date) {
                          setLocalEndTime("");
                          updateEndTime?.("");
                          return;
                        }

                        const time =
                          localEndTime ||
                          localStartTime ||
                          "10:00";

                        if (!localEndTime) {
                          setLocalEndTime(time);
                        }

                        const value = combineDateAndTime(date, time);

                        if (
                          startDateTimeValue &&
                          value < startDateTimeValue
                        ) {
                          setErrMsg?.(
                            "Дуусах хугацаа эхлэх хугацаанаас өмнө байж болохгүй."
                          );
                          return;
                        }

                        setErrMsg?.("");
                        updateEndTime?.(value);
                      }}
                    />
                  </div>

                  <input
                    type="time"
                    step="60"
                    value={localEndTime}
                    disabled={!localStartDate}
                    onChange={(event) => {
                      const time = event.target.value;
                      setLocalEndTime(time);

                      const date =
                        localEndDate || localStartDate;

                      if (!date || !time) {
                        return;
                      }

                      const value = combineDateAndTime(date, time);

                      if (
                        startDateTimeValue &&
                        value < startDateTimeValue
                      ) {
                        setErrMsg?.(
                          "Дуусах хугацаа эхлэх хугацаанаас өмнө байж болохгүй."
                        );
                        return;
                      }

                      setErrMsg?.("");
                      updateEndTime?.(value);
                    }}
                  />
                </div>
              </label>
            </div>

            <label className="eventWizardField">
              <span>
                ОРОЛЦОГЧИЙН ДЭЭД ТОО
              </span>

              <div className="eventWizardInputIcon">
                <FiUsers />

                <input
                  type="number"
                  min="0"
                  value={
                    max_participants ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setMaxParticipants?.(
                      event.target
                        .value
                    )
                  }
                  placeholder="Жишээ: 500"
                />
              </div>
            </label>

            <div className="eventWizardSectionTitle">
              <div>
                <h3>
                  Илтгэгчид
                </h3>

                <p>
                  Add speakers for
                  this event.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  addSpeaker
                }
              >
                <FiPlus />

                Илтгэгч нэмэх
              </button>
            </div>

            <div className="eventWizardSpeakers">
              {speakers.map(
                (
                  speaker,
                  index
                ) => {
                  let currentAvatar =
                    "";

                  if (
                    typeof File !==
                      "undefined" &&
                    speaker.avatar instanceof
                      File
                  ) {
                    currentAvatar =
                      URL.createObjectURL(
                        speaker.avatar
                      );
                  } else if (
                    typeof getSpeakerAvatar ===
                    "function"
                  ) {
                    const avatar =
                      getSpeakerAvatar(
                        speaker
                      );

                    currentAvatar =
                      typeof resolveUrl ===
                      "function"
                        ? resolveUrl(
                            avatar
                          )
                        : avatar;
                  }

                  return (
                    <div
                      className="eventWizardSpeaker"
                      key={
                        index
                      }
                    >
                      <label className="eventWizardSpeakerAvatar">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.gif"
                          onChange={(
                            event
                          ) => {
                            const file =
                              event
                                .target
                                .files?.[0] ||
                              null;

                            if (
                              !file
                            ) {
                              handleSpeakerChange?.(
                                index,
                                "avatar",
                                null
                              );

                              return;
                            }

                            if (
                              typeof isSvgFile ===
                                "function" &&
                              isSvgFile(
                                file
                              )
                            ) {
                              setErrMsg?.(
                                "SVG зураг дэмжигдэхгүй."
                              );

                              event.target.value =
                                "";

                              return;
                            }

                            handleSpeakerChange?.(
                              index,
                              "avatar",
                              file
                            );
                          }}
                        />

                        {currentAvatar ? (
                          <img
                            src={
                              currentAvatar
                            }
                            alt=""
                          />
                        ) : (
                          <FiUploadCloud />
                        )}
                      </label>

                      <div className="eventWizardSpeakerFields">
                        <input
                          value={
                            speaker.name ||
                            ""
                          }
                          placeholder="Нэр"
                          onChange={(
                            event
                          ) =>
                            handleSpeakerChange?.(
                              index,
                              "name",
                              event
                                .target
                                .value
                            )
                          }
                        />

                        <input
                          value={
                            speaker.organization ||
                            ""
                          }
                          placeholder="Байгууллага"
                          onChange={(
                            event
                          ) =>
                            handleSpeakerChange?.(
                              index,
                              "organization",
                              event
                                .target
                                .value
                            )
                          }
                        />

                        <input
                          value={
                            speaker.topic ||
                            ""
                          }
                          placeholder="Сэдэв"
                          onChange={(
                            event
                          ) =>
                            handleSpeakerChange?.(
                              index,
                              "topic",
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </div>

                      {speakers.length >
                      1 ? (
                        <button
                          type="button"
                          className="eventWizardDelete"
                          onClick={() =>
                            removeSpeaker?.(
                              index
                            )
                          }
                        >
                          <FiTrash2 />
                        </button>
                      ) : null}
                    </div>
                  );
                }
              )}
            </div>

            <div className="eventWizardSectionTitle">
              <div>
                <h3>
                  Хөтөлбөр
                </h3>

                <p>
                  Add the event
                  schedule.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addAgenda?.()}
              >
                <FiPlus />

                Хөтөлбөр нэмэх
              </button>
            </div>

            <div className="eventWizardAgenda">
              {agendas.map(
                (
                  agenda,
                  index
                ) => (
                  <div
                    className="eventWizardAgendaRow"
                    key={
                      index
                    }
                  >
                    <input
                      type="time"
                      value={
                        agenda.time ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        updateAgenda?.(
                          index,
                          "time",
                          event
                            .target
                            .value
                        )
                      }
                    />

                    <input
                      type="text"
                      value={
                        agenda.text ||
                        ""
                      }
                      placeholder="Хөтөлбөрийн нэр"
                      onChange={(
                        event
                      ) =>
                        updateAgenda?.(
                          index,
                          "text",
                          event
                            .target
                            .value
                        )
                      }
                    />

                    {agendas.length >
                    1 ? (
                      <button
                        type="button"
                        className="eventWizardDelete"
                        onClick={() =>
                          removeAgenda?.(index)
                        }
                      >
                        <FiTrash2 />
                      </button>
                    ) : null}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="eventWizardPreview">
              <div className="eventWizardPreviewHero">
                {previewImage ? (
                  <img
                    src={
                      previewImage
                    }
                    alt={
                      title ||
                      "Эвент"
                    }
                  />
                ) : (
                  <div className="eventWizardPreviewPlaceholder">
                    <FiImage />
                  </div>
                )}

                <div className="eventWizardPreviewOverlay">
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 8,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <span>
                      {visibility ===
                      "private"
                        ? "Хаалттай"
                        : "Нийтийн"}
                    </span>

                    {badge?.trim() ? (
                      <span>
                        {badge.trim()}
                      </span>
                    ) : null}
                  </div>

                  <h2>
                    {title?.trim() ||
                      "Нэргүй эвент"}
                  </h2>
                </div>
              </div>

              <div className="eventWizardPreviewGrid">
                <div>
                  <small>
                    Эхлэх
                  </small>

                  <strong>
                    {formatPreviewDate(
                      start_time
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    Дуусах
                  </small>

                  <strong>
                    {end_time
                      ? formatPreviewDate(
                          end_time
                        )
                      : "Тодорхойгүй"}
                  </strong>
                </div>

                <div>
                  <small>
                    Багтаамж
                  </small>

                  <strong>
                    {max_participants
                      ? `${max_participants} хүн`
                      : "Хязгааргүй"}
                  </strong>
                </div>

                <div>
                  <small>
                    Харагдах байдал
                  </small>

                  <strong>
                    {visibility ===
                    "private"
                      ? "Хаалттай"
                      : "Нийтийн"}
                  </strong>
                </div>

                <div>
                  <small>
                    Төрөл
                  </small>

                  <strong>
                    {badge?.trim() ||
                      "Тодорхойгүй"}
                  </strong>
                </div>
              </div>

              {description ? (
                <div className="eventWizardPreviewDescription">
                  <small>
                    Тайлбар
                  </small>

                  <p>
                    {description}
                  </p>
                </div>
              ) : null}
            </div>

            {!title?.trim() ||
            !badge?.trim() ||
            !start_time ? (
              <div className="eventWizardWarning">
                Please enter an
                event title, select
                a badge and choose
                a start date/time
                before publishing.
              </div>
            ) : null}
          </>
        )}

        {errMsg ? (
          <div className="eventWizardError">
            {errMsg}
          </div>
        ) : null}

        {successMsg ? (
          <div className="eventWizardSuccess">
            {successMsg}
          </div>
        ) : null}

        <div className="eventWizardActions">
          {step > 1 ? (
            <button
              type="button"
              className="eventWizardPrevious"
              onClick={
                previousStep
              }
            >
              <FiArrowLeft />

              Өмнөх
            </button>
          ) : (
            <button
              type="button"
              className="eventWizardPrevious"
              onClick={
                closeCreate
              }
            >
              Цуцлах
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="eventWizardContinue"
              onClick={
                nextStep
              }
            >
              Үргэлжлүүлэх

              <FiArrowRight />
            </button>
          ) : (
            <button
              type="submit"
              className="eventWizardContinue"
              disabled={
                creating ||
                !title?.trim() ||
                !badge?.trim() ||
                !start_time
              }
            >
              {creating
                ? editingEventId
                  ? "Хадгалж байна..."
                  : "Үүсгэж байна..."
                : editingEventId
                  ? "Өөрчлөлт хадгалах"
                  : "Эвент нийтлэх"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}