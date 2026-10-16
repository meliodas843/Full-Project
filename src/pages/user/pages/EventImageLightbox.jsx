// Extracted from Event.jsx; receives the page state it reads as props.
export default function EventImageLightbox({
  closeLightbox,
  currentLb,
  downloadFile,
  goNext,
  goPrev,
  imageFiles,
  lbIndex,
  lbThumbStripRef,
  setLbIndex,
}) {
  return (
    <div
      className="uep-lbOverlay"
      onClick={closeLightbox}
      role="presentation"
    >
      <button
        className="uep-lbArrow uep-lbArrowLeft"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
    
          goPrev();
        }}
      >
        ‹
      </button>
    
      <div
        className="uep-lbStage"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="uep-lbTopRight">
          <button
            className="uep-lbIconBtn"
            type="button"
            title="Суулгах"
            onClick={() =>
              downloadFile(
                currentLb.rawUrl,
    
                currentLb.name,
              )
            }
          >
            ⬇
          </button>
    
          <button
            className="uep-lbIconBtn"
            type="button"
            title="Шинэ хуудас дээр нээх"
            onClick={() =>
              window.open(
                currentLb.url,
    
                "_blank",
    
                "noopener,noreferrer",
              )
            }
          >
            ⤴
          </button>
    
          <button
            className="uep-lbIconBtn"
            type="button"
            title="Хаах"
            onClick={closeLightbox}
          >
            ✕
          </button>
        </div>
    
        <img
          className="uep-lbImage"
          src={currentLb.url}
          alt={currentLb.name}
        />
    
        <div className="uep-lbThumbStrip" ref={lbThumbStripRef}>
          {imageFiles.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`uep-lbThumb ${i === lbIndex ? "isActive" : ""}`}
              onClick={() => setLbIndex(i)}
              data-lbthumb={i}
              title={img.name}
            >
              <img src={img.url} alt={img.name} />
            </button>
          ))}
        </div>
      </div>
    
      <button
        className="uep-lbArrow uep-lbArrowRight"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
    
          goNext();
        }}
      >
        ›
      </button>
    </div>
  );
}
