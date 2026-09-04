import { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiEye,
  FiImage,
  FiLock,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiUsers,
} from "react-icons/fi";

function resolvePreview(imageFile, imageUrl, resolveUrl) {
  if (imageFile instanceof File) {
    return URL.createObjectURL(imageFile);
  }

  if (imageUrl) {
    return resolveUrl(imageUrl);
  }

  return "";
}

function formatPreviewDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function EventCreateWizard({
  editingEventId,
  title,
  setTitle,
  description,
  setDescription,
  speakers,
  handleSpeakerChange,
  addSpeaker,
  removeSpeaker,
  agendas,
  handleAgendaChange,
  addAgendaItem,
  removeAgendaItem,
  start_time,
  setStartTime,
  end_time,
  setEndTime,
  image_url,
  setImageUrl,
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
  const [step, setStep] = useState(1);

  const previewImage = useMemo(
    () => resolvePreview(imageFile, image_url, resolveUrl),
    [imageFile, image_url, resolveUrl],
  );

  function validateStepOne() {
    if (!title.trim()) {
      setErrMsg("Event title is required.");
      return false;
    }

    setErrMsg("");
    return true;
  }

  function validateStepTwo() {
    if (!start_time) {
      setErrMsg("Start date and time are required.");
      return false;
    }

    if (
      end_time &&
      new Date(end_time).getTime() < new Date(start_time).getTime()
    ) {
      setErrMsg("End time cannot be earlier than start time.");
      return false;
    }

    setErrMsg("");
    return true;
  }

  function nextStep() {
    if (step === 1 && !validateStepOne()) return;
    if (step === 2 && !validateStepTwo()) return;

    setStep((current) => Math.min(3, current + 1));
  }

  function previousStep() {
    setErrMsg("");
    setStep((current) => Math.max(1, current - 1));
  }

  function submitEvent(event) {
    if (!validateStepOne()) {
      setStep(1);
      return;
    }

    if (!validateStepTwo()) {
      setStep(2);
      return;
    }

    handleCreate(event);
  }

  const currentAvatar = (speaker) => {
    if (speaker.avatar instanceof File) {
      return URL.createObjectURL(speaker.avatar);
    }

    return resolveUrl(getSpeakerAvatar(speaker));
  };

  return (
    <div className="eventWizard">
      <div className="eventWizardHeader">
        <button
          type="button"
          className="eventWizardBack"
          onClick={closeCreate}
        >
          <FiArrowLeft />
        </button>

        <div>
          <h2>{editingEventId ? "Edit Event" : "Create Event"}</h2>
          <p>
            Step {step} of 3 —{" "}
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
            step >= 1 ? "active" : ""
          } ${step > 1 ? "completed" : ""}`}
        >
          <span>{step > 1 ? <FiCheck /> : "1"}</span>
          <strong>Basic Info</strong>
        </div>

        <div
          className={`eventWizardLine ${
            step >= 2 ? "active" : ""
          }`}
        />

        <div
          className={`eventWizardStep ${
            step >= 2 ? "active" : ""
          } ${step > 2 ? "completed" : ""}`}
        >
          <span>{step > 2 ? <FiCheck /> : "2"}</span>
          <strong>Date & Location</strong>
        </div>

        <div
          className={`eventWizardLine ${
            step >= 3 ? "active" : ""
          }`}
        />

        <div
          className={`eventWizardStep ${
            step >= 3 ? "active" : ""
          }`}
        >
          <span>3</span>
          <strong>Preview & Publish</strong>
        </div>
      </div>

      <form
        className="eventWizardForm"
        onSubmit={submitEvent}
      >
        {step === 1 && (
          <div className="eventWizardPanel">
            <label className="eventWizardField">
              <span>EVENT TITLE *</span>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. Tech Summit 2026"
              />
            </label>

            <label className="eventWizardField">
              <span>VISIBILITY</span>

              <div className="eventWizardSelectIcon">
                {visibility === "private" ? (
                  <FiLock />
                ) : (
                  <FiEye />
                )}

                <select
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value)
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
              <span>FULL DESCRIPTION</span>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Detailed event description — agenda, speakers, what to expect..."
                rows={6}
              />
            </label>

            <label className="eventWizardField">
              <span>COVER IMAGE URL</span>

              <div className="eventWizardInputIcon">
                <FiImage />

                <input
                  value={image_url}
                  onChange={(event) =>
                    setImageUrl(event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
            </label>

            <div className="eventWizardField">
              <span>UPLOAD COVER IMAGE</span>

              <label className="eventWizardUpload">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0] || null;

                    if (!file) {
                      setImageFile(null);
                      return;
                    }

                    if (isSvgFile(file)) {
                      setErrMsg(
                        "SVG images are not supported.",
                      );

                      setImageFile(null);
                      event.target.value = "";
                      return;
                    }

                    setErrMsg("");
                    setImageFile(file);
                  }}
                />

                <FiUploadCloud />

                <div>
                  <strong>
                    {imageFile
                      ? imageFile.name
                      : "Choose cover image"}
                  </strong>

                  <small>
                    PNG, JPG, JPEG, WEBP, GIF
                  </small>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="eventWizardPanel">
            <div className="eventWizardTwoColumns">
              <label className="eventWizardField">
                <span>START DATE & TIME *</span>

                <div className="eventWizardInputIcon">
                  <FiCalendar />

                  <input
                    type="datetime-local"
                    value={start_time}
                    min={
                      editingEventId
                        ? undefined
                        : minDateTime
                    }
                    onChange={(event) => {
                      const value = event.target.value;

                      if (
                        !editingEventId &&
                        value &&
                        value < minDateTime
                      ) {
                        setErrMsg(
                          "Past dates are not allowed.",
                        );
                        return;
                      }

                      setErrMsg("");
                      setStartTime(value);

                      if (
                        end_time &&
                        value &&
                        end_time < value
                      ) {
                        setEndTime("");
                      }
                    }}
                  />
                </div>
              </label>

              <label className="eventWizardField">
                <span>END DATE & TIME</span>

                <div className="eventWizardInputIcon">
                  <FiCalendar />

                  <input
                    type="datetime-local"
                    value={end_time}
                    min={start_time || minDateTime}
                    disabled={!start_time}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (
                        start_time &&
                        value &&
                        value < start_time
                      ) {
                        setErrMsg(
                          "End time cannot be earlier than start time.",
                        );
                        return;
                      }

                      setErrMsg("");
                      setEndTime(value);
                    }}
                  />
                </div>
              </label>
            </div>

            <label className="eventWizardField">
              <span>CAPACITY</span>

              <div className="eventWizardInputIcon">
                <FiUsers />

                <input
                  type="number"
                  min="0"
                  value={max_participants}
                  onChange={(event) =>
                    setMaxParticipants(event.target.value)
                  }
                  placeholder="Maximum number of attendees"
                />
              </div>
            </label>

            <div className="eventWizardSummary">
              <FiCalendar />

              <div>
                <strong>
                  {start_time
                    ? formatPreviewDate(start_time)
                    : "No date set"}
                </strong>

                <span>
                  {max_participants
                    ? `${max_participants} attendees`
                    : "Unlimited capacity"}
                </span>
              </div>
            </div>

            <div className="eventWizardSectionTitle">
              <div>
                <h3>Speakers</h3>
                <p>
                  Add the speakers participating in
                  this event.
                </p>
              </div>

              <button
                type="button"
                onClick={addSpeaker}
              >
                <FiPlus />
                Add Speaker
              </button>
            </div>

            <div className="eventWizardSpeakers">
              {speakers.map((speaker, index) => (
                <div
                  className="eventWizardSpeaker"
                  key={index}
                >
                  <label className="eventWizardSpeakerAvatar">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif"
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0] ||
                          null;

                        if (!file) {
                          handleSpeakerChange(
                            index,
                            "avatar",
                            null,
                          );
                          return;
                        }

                        if (isSvgFile(file)) {
                          setErrMsg(
                            "SVG avatars are not supported.",
                          );

                          event.target.value = "";
                          return;
                        }

                        setErrMsg("");

                        handleSpeakerChange(
                          index,
                          "avatar",
                          file,
                        );
                      }}
                    />

                    {currentAvatar(speaker) ? (
                      <img
                        src={currentAvatar(speaker)}
                        alt=""
                      />
                    ) : (
                      <FiUploadCloud />
                    )}
                  </label>

                  <div className="eventWizardSpeakerFields">
                    <input
                      value={speaker.name || ""}
                      placeholder="Name"
                      onChange={(event) =>
                        handleSpeakerChange(
                          index,
                          "name",
                          event.target.value,
                        )
                      }
                    />

                    <input
                      value={
                        speaker.organization || ""
                      }
                      placeholder="Organization"
                      onChange={(event) =>
                        handleSpeakerChange(
                          index,
                          "organization",
                          event.target.value,
                        )
                      }
                    />

                    <input
                      value={speaker.topic || ""}
                      placeholder="Topic"
                      onChange={(event) =>
                        handleSpeakerChange(
                          index,
                          "topic",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {speakers.length > 1 && (
                    <button
                      type="button"
                      className="eventWizardDelete"
                      onClick={() =>
                        removeSpeaker(index)
                      }
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="eventWizardSectionTitle">
              <div>
                <h3>Agenda</h3>
                <p>
                  Build the schedule for your event.
                </p>
              </div>

              <button
                type="button"
                onClick={addAgendaItem}
              >
                <FiPlus />
                Add Agenda
              </button>
            </div>

            <div className="eventWizardAgenda">
              {agendas.map((agenda, index) => (
                <div
                  className="eventWizardAgendaRow"
                  key={index}
                >
                  <input
                    type="time"
                    value={agenda.time || ""}
                    onChange={(event) =>
                      handleAgendaChange(
                        index,
                        "time",
                        event.target.value,
                      )
                    }
                  />

                  <input
                    value={agenda.text || ""}
                    placeholder="Agenda title"
                    onChange={(event) =>
                      handleAgendaChange(
                        index,
                        "text",
                        event.target.value,
                      )
                    }
                  />

                  {agendas.length > 1 && (
                    <button
                      type="button"
                      className="eventWizardDelete"
                      onClick={() =>
                        removeAgendaItem(index)
                      }
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="eventWizardPreview">
              <div className="eventWizardPreviewHero">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={title || "Event"}
                  />
                ) : (
                  <div className="eventWizardPreviewPlaceholder">
                    <FiImage />
                  </div>
                )}

                <div className="eventWizardPreviewShade" />

                <div className="eventWizardPreviewOverlay">
                  <span>
                    {visibility === "private"
                      ? "Private"
                      : "Public"}
                  </span>

                  <h2>
                    {title.trim() || "Untitled Event"}
                  </h2>
                </div>
              </div>

              <div className="eventWizardPreviewGrid">
                <div>
                  <small>Date & Time</small>

                  <strong>
                    {start_time
                      ? formatPreviewDate(start_time)
                      : "Not set"}
                  </strong>
                </div>

                <div>
                  <small>End</small>

                  <strong>
                    {end_time
                      ? formatPreviewDate(end_time)
                      : "Not set"}
                  </strong>
                </div>

                <div>
                  <small>Capacity</small>

                  <strong>
                    {max_participants
                      ? `${max_participants} attendees`
                      : "Unlimited"}
                  </strong>
                </div>

                <div>
                  <small>Visibility</small>

                  <strong>
                    {visibility === "private"
                      ? "Private"
                      : "Public"}
                  </strong>
                </div>
              </div>

              {description && (
                <div className="eventWizardPreviewDescription">
                  <small>About this Event</small>
                  <p>{description}</p>
                </div>
              )}
            </div>

            {(!title.trim() || !start_time) && (
              <div className="eventWizardWarning">
                Event title and start date are required
                before publishing.
              </div>
            )}
          </>
        )}

        {errMsg && (
          <div className="eventWizardError">
            {errMsg}
          </div>
        )}

        {successMsg && (
          <div className="eventWizardSuccess">
            {successMsg}
          </div>
        )}

        <div className="eventWizardActions">
          {step > 1 ? (
            <button
              type="button"
              className="eventWizardPrevious"
              onClick={previousStep}
            >
              <FiArrowLeft />
              Previous
            </button>
          ) : (
            <button
              type="button"
              className="eventWizardPrevious"
              onClick={closeCreate}
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="eventWizardContinue"
              onClick={nextStep}
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
                !title.trim() ||
                !start_time
              }
            >
              {creating
                ? editingEventId
                  ? "Saving..."
                  : "Publishing..."
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