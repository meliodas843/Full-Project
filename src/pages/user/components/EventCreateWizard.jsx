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
  "Technology",
  "Business",
  "Education",
  "Conference",
  "Workshop",
  "Networking",
  "Community",
  "Sports",
  "Entertainment",
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

function formatPreviewDate(
  value
) {
  if (!value) {
    return "Not specified";
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
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
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

  start_time,
  setStartTime,

  end_time,
  setEndTime,

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
  const [step, setStep] =
    useState(1);

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
      BADGE_OPTIONS.includes(
        currentBadge
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
          "Badge тохиргооны алдаа гарлаа. Event.jsx дээр setBadge prop дамжуулсан эсэхийг шалгана уу."
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
        "Please enter an event title."
      );

      return false;
    }

    if (
      badgeMode ===
        "custom" &&
      !customBadge.trim()
    ) {
      setErrMsg?.(
        "Please enter a custom badge."
      );

      return false;
    }

    if (!badge?.trim()) {
      setErrMsg?.(
        "Please select or enter a badge."
      );

      return false;
    }

    setErrMsg?.("");

    return true;
  }

  function validateStepTwo() {
    if (!start_time) {
      setErrMsg?.(
        "Please select a start date and time."
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
        "End time cannot be before start time."
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
              ? "Edit Event"
              : "Create Event"}
          </h2>

          <p>
            Step {step} of 3
            {" — "}

            {step === 1
              ? "Basic Info"
              : step === 2
                ? "Date & Location"
                : "Preview & Publish"}
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
            Basic Info
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
            Date & Location
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
            Preview & Publish
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
                EVENT TITLE *
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
                placeholder="Example: Tech Summit 2026"
              />
            </label>

            <label className="eventWizardField">
              <span>
                SELECT BADGE *
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
                    Select badge
                  </option>

                  {BADGE_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option
                        }
                        value={
                          option
                        }
                      >
                        {option}
                      </option>
                    )
                  )}

                  <option value="custom">
                    Other / Custom
                  </option>
                </select>
              </div>
            </label>

            {badgeMode ===
              "custom" && (
              <label className="eventWizardField">
                <span>
                  CUSTOM BADGE *
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
                    placeholder="Example: Cybersecurity"
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
                VISIBILITY
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
                    Public Event
                  </option>

                  <option value="private">
                    Private Event
                  </option>
                </select>
              </div>
            </label>

            <label className="eventWizardField">
              <span>
                FULL DESCRIPTION
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
                placeholder="Enter the event description..."
                rows={6}
              />
            </label>

            <div className="eventWizardField">
              <span>
                UPLOAD COVER IMAGE
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
                        "SVG images are not supported."
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
                        ? "Choose a new cover image"
                        : "Choose cover image"}
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
                    alt="Current cover"
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
                  START DATE & TIME *
                </span>

                <div className="eventWizardInputIcon">
                  <FiCalendar />

                  <input
                    type="datetime-local"
                    value={
                      start_time ||
                      ""
                    }
                    min={
                      editingEventId
                        ? undefined
                        : minDateTime
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event
                          .target
                          .value;

                      if (
                        !editingEventId &&
                        value &&
                        minDateTime &&
                        value <
                          minDateTime
                      ) {
                        setErrMsg?.(
                          "Past dates are not allowed."
                        );

                        return;
                      }

                      setErrMsg?.(
                        ""
                      );

                      setStartTime?.(
                        value
                      );

                      if (
                        end_time &&
                        value &&
                        end_time <
                          value
                      ) {
                        setEndTime?.(
                          ""
                        );
                      }
                    }}
                  />
                </div>
              </label>

              <label className="eventWizardField">
                <span>
                  END DATE & TIME
                </span>

                <div className="eventWizardInputIcon">
                  <FiCalendar />

                  <input
                    type="datetime-local"
                    value={
                      end_time ||
                      ""
                    }
                    min={
                      start_time ||
                      minDateTime
                    }
                    disabled={
                      !start_time
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event
                          .target
                          .value;

                      if (
                        start_time &&
                        value &&
                        value <
                          start_time
                      ) {
                        setErrMsg?.(
                          "End time cannot be before start time."
                        );

                        return;
                      }

                      setErrMsg?.(
                        ""
                      );

                      setEndTime?.(
                        value
                      );
                    }}
                  />
                </div>
              </label>
            </div>

            <label className="eventWizardField">
              <span>
                MAX PARTICIPANTS
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
                  placeholder="Example: 500"
                />
              </div>
            </label>

            <div className="eventWizardSectionTitle">
              <div>
                <h3>
                  Speakers
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

                Add Speaker
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
                                "SVG images are not supported."
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
                          placeholder="Name"
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
                          placeholder="Organization"
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
                          placeholder="Topic"
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
                  Agenda
                </h3>

                <p>
                  Add the event
                  schedule.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  addAgendaItem
                }
              >
                <FiPlus />

                Add Agenda
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
                        handleAgendaChange?.(
                          index,
                          "time",
                          event
                            .target
                            .value
                        )
                      }
                    />

                    <input
                      value={
                        agenda.text ||
                        ""
                      }
                      placeholder="Agenda title"
                      onChange={(
                        event
                      ) =>
                        handleAgendaChange?.(
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
                          removeAgendaItem?.(
                            index
                          )
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
                      "Event"
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
                        ? "Private"
                        : "Public"}
                    </span>

                    {badge?.trim() ? (
                      <span>
                        {badge.trim()}
                      </span>
                    ) : null}
                  </div>

                  <h2>
                    {title?.trim() ||
                      "Untitled Event"}
                  </h2>
                </div>
              </div>

              <div className="eventWizardPreviewGrid">
                <div>
                  <small>
                    Start
                  </small>

                  <strong>
                    {formatPreviewDate(
                      start_time
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    End
                  </small>

                  <strong>
                    {end_time
                      ? formatPreviewDate(
                          end_time
                        )
                      : "Not specified"}
                  </strong>
                </div>

                <div>
                  <small>
                    Capacity
                  </small>

                  <strong>
                    {max_participants
                      ? `${max_participants} people`
                      : "Unlimited"}
                  </strong>
                </div>

                <div>
                  <small>
                    Visibility
                  </small>

                  <strong>
                    {visibility ===
                    "private"
                      ? "Private"
                      : "Public"}
                  </strong>
                </div>

                <div>
                  <small>
                    Badge
                  </small>

                  <strong>
                    {badge?.trim() ||
                      "Not specified"}
                  </strong>
                </div>
              </div>

              {description ? (
                <div className="eventWizardPreviewDescription">
                  <small>
                    Description
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

              Previous
            </button>
          ) : (
            <button
              type="button"
              className="eventWizardPrevious"
              onClick={
                closeCreate
              }
            >
              Cancel
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
              Continue

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
                  ? "Saving..."
                  : "Creating..."
                : editingEventId
                  ? "Save Changes"
                  : "Publish Event"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}