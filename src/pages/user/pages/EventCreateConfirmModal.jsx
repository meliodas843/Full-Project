// Extracted from Event.jsx; receives the page state it reads as props.
export default function EventCreateConfirmModal({
  checkingPayment,
  handleCheckPayment,
  paymentEvent,
  setPaymentEvent,
}) {
  return (
    <div className="uep-modalOverlay">
      <div className="uep-modal payment-modal">
        {!checkingPayment ? (
          <>
            <h3 className="uep-modalTitle">Төлбөрийн мэдээлэл</h3>
    
            <div className="payment-info">
              <p>
                <strong>Банк:</strong> Хаан банк
              </p>
    
              <p>
                <strong>Данс:</strong> 5000000000
              </p>
    
              <p>
                <strong>Хүлээн авагч:</strong> IT Insight
              </p>
    
              <p>
                <strong>Гүйлгээний утга:</strong> {paymentEvent.title}
              </p>
            </div>
    
            <p className="payment-desc">
              Төлбөрөө шилжүүлсний дараа админаас баталгаажтал түр хүлээнэ
              үү. Баталгаажсаны дараа эвентэд бүртгэгдэх болно. Баярлалаа
            </p>
    
            <div className="uep-modalActions">
              <button
                className="uep-modalNo"
                type="button"
                onClick={() => setPaymentEvent(null)}
              >
                Цуцлах
              </button>
    
              <button
                className="uep-modalYes"
                type="button"
                onClick={handleCheckPayment}
              >
                Хүсэлт явуулах
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="uep-modalTitle">Төлбөр шалгаж байна...</h3>
    
            <p className="payment-desc">
              Банкны дансыг шалгаж байна. Түр хүлээнэ үү.
            </p>
    
            <div className="payment-loader" />
          </>
        )}
      </div>
    </div>
  );
}
