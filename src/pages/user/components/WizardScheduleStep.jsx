import { combineDateAndTime, getDatePart } from "./EventCreateWizard.helpers";
import { FiCalendar, FiPlus, FiTrash2, FiUploadCloud, FiUsers } from "react-icons/fi";

// Extracted from EventCreateWizard.jsx; receives the page state it reads as props.
export default function WizardScheduleStep({
  addAgenda,
  addSpeaker,
  agendas,
  editingEventId,
  endDateTimeValue,
  getSpeakerAvatar,
  handleSpeakerChange,
  isSvgFile,
  localEndDate,
  localEndTime,
  localStartDate,
  localStartTime,
  max_participants,
  minimumDateTimeValue,
  removeAgenda,
  removeSpeaker,
  resolveUrl,
  setErrMsg,
  setLocalEndDate,
  setLocalEndTime,
  setLocalStartDate,
  setLocalStartTime,
  setMaxParticipants,
  speakers,
  startDateTimeValue,
  updateAgenda,
  updateEndTime,
  updateStartTime,
}) {
  return (
    <div className="eventWizardPanel">
      <div className="eventWizardTwoColumns">
        <label className="eventWizardField">
          <span>ЭХЛЭХ ОГНОО, ЦАГ *</span>
    
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
    
                  if (endDateTimeValue && endDateTimeValue < value) {
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
    
                const value = combineDateAndTime(localStartDate, time);
    
                setErrMsg?.("");
    
                updateStartTime?.(value);
    
                if (endDateTimeValue && endDateTimeValue < value) {
                  setLocalEndDate("");
    
                  setLocalEndTime("");
    
                  updateEndTime?.("");
                }
              }}
            />
          </div>
        </label>
    
        <label className="eventWizardField">
          <span>ДУУСАХ ОГНОО, ЦАГ</span>
    
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
    
                  const time = localEndTime || localStartTime || "10:00";
    
                  if (!localEndTime) {
                    setLocalEndTime(time);
                  }
    
                  const value = combineDateAndTime(date, time);
    
                  if (startDateTimeValue && value < startDateTimeValue) {
                    setErrMsg?.(
                      "Дуусах хугацаа эхлэх хугацаанаас өмнө байж болохгүй.",
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
    
                const date = localEndDate || localStartDate;
    
                if (!date || !time) {
                  return;
                }
    
                const value = combineDateAndTime(date, time);
    
                if (startDateTimeValue && value < startDateTimeValue) {
                  setErrMsg?.(
                    "Дуусах хугацаа эхлэх хугацаанаас өмнө байж болохгүй.",
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
        <span>ОРОЛЦОГЧИЙН ДЭЭД ТОО</span>
    
        <div className="eventWizardInputIcon">
          <FiUsers />
    
          <input
            type="number"
            min="0"
            value={max_participants || ""}
            onChange={(event) => setMaxParticipants?.(event.target.value)}
            placeholder="Жишээ: 500"
          />
        </div>
      </label>
    
      <div className="eventWizardSectionTitle">
        <div>
          <h3>Илтгэгчид</h3>
    
          <p>Энэ эвентэд оролцох илтгэгчдийг нэмнэ үү.</p>
        </div>
    
        <button type="button" onClick={addSpeaker}>
          <FiPlus />
          Илтгэгч нэмэх
        </button>
      </div>
    
      <div className="eventWizardSpeakers">
        {speakers.map((speaker, index) => {
          let currentAvatar = "";
    
          if (
            typeof File !== "undefined" &&
            speaker.avatar instanceof File
          ) {
            currentAvatar = URL.createObjectURL(speaker.avatar);
          } else if (typeof getSpeakerAvatar === "function") {
            const avatar = getSpeakerAvatar(speaker);
    
            currentAvatar =
              typeof resolveUrl === "function"
                ? resolveUrl(avatar)
                : avatar;
          }
    
          return (
            <div className="eventWizardSpeaker" key={index}>
              <label className="eventWizardSpeakerAvatar">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
    
                    if (!file) {
                      handleSpeakerChange?.(index, "avatar", null);
    
                      return;
                    }
    
                    if (
                      typeof isSvgFile === "function" &&
                      isSvgFile(file)
                    ) {
                      setErrMsg?.("SVG зураг дэмжигдэхгүй.");
    
                      event.target.value = "";
    
                      return;
                    }
    
                    handleSpeakerChange?.(index, "avatar", file);
                  }}
                />
    
                {currentAvatar ? (
                  <img src={currentAvatar} alt="" />
                ) : (
                  <FiUploadCloud />
                )}
              </label>
    
              <div className="eventWizardSpeakerFields">
                <input
                  value={speaker.name || ""}
                  placeholder="Нэр"
                  onChange={(event) =>
                    handleSpeakerChange?.(
                      index,
    
                      "name",
    
                      event.target.value,
                    )
                  }
                />
    
                <input
                  value={speaker.organization || ""}
                  placeholder="Байгууллага"
                  onChange={(event) =>
                    handleSpeakerChange?.(
                      index,
    
                      "organization",
    
                      event.target.value,
                    )
                  }
                />
    
                <input
                  value={speaker.topic || ""}
                  placeholder="Сэдэв"
                  onChange={(event) =>
                    handleSpeakerChange?.(
                      index,
    
                      "topic",
    
                      event.target.value,
                    )
                  }
                />
              </div>
    
              {speakers.length > 1 ? (
                <button
                  type="button"
                  className="eventWizardDelete"
                  onClick={() => removeSpeaker?.(index)}
                >
                  <FiTrash2 />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    
      <div className="eventWizardSectionTitle">
        <div>
          <h3>Хөтөлбөр</h3>
    
          <p>Эвентийн хөтөлбөрийг нэмнэ үү..</p>
        </div>
    
        <button type="button" onClick={() => addAgenda?.()}>
          <FiPlus />
          Хөтөлбөр нэмэх
        </button>
      </div>
    
      <div className="eventWizardAgenda">
        {agendas.map((agenda, index) => (
          <div className="eventWizardAgendaRow" key={index}>
            <input
              type="time"
              value={agenda.time || ""}
              onChange={(event) =>
                updateAgenda?.(index, "time", event.target.value)
              }
            />
    
            <input
              type="text"
              value={agenda.text || ""}
              placeholder="Хөтөлбөрийн нэр"
              onChange={(event) =>
                updateAgenda?.(index, "text", event.target.value)
              }
            />
    
            {agendas.length > 1 ? (
              <button
                type="button"
                className="eventWizardDelete"
                onClick={() => removeAgenda?.(index)}
              >
                <FiTrash2 />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
