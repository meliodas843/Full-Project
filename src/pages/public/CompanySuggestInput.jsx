import { useEffect, useId, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiPlus } from "react-icons/fi";
import { API_BASE, getImageSrc } from "../../lib/config";
import "./companySuggest.css";

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// A text input that suggests registered organizations while typing. Picking
// one fills the field, but any name can still be typed and saved.
// `warnExact` (company sign-up) points out when the exact name is taken.
export default function CompanySuggestInput({
  name,
  value,
  onChange,
  placeholder,
  required,
  warnExact = false,
}) {
  const listId = useId();
  const [results, setResults] = useState({ query: "", items: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();

  useEffect(() => {
    if (!query) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/organizations/suggest?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          },
        );
        const data = await res.json().catch(() => ({}));
        setResults({ query, items: res.ok ? data.organizations || [] : [] });
        setActive(-1);
      } catch {
        // Aborted or offline: keep whatever was shown.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Results for an older query (or an emptied field) are not shown.
  const items = query && results.query === query ? results.items : [];
  const exact = items.find((org) => sameName(org.name, query));
  // "Add new" is offered next to real matches; with no matches the typed
  // name simply stays.
  const options = [
    ...items.map((org) => ({ org })),
    ...(items.length && !exact ? [{ add: true }] : []),
  ];
  const showList = open && options.length > 0;

  const setValue = (next) => onChange({ target: { name, value: next } });

  function choose(option) {
    if (option.org) setValue(option.org.name);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event) {
    if (!showList) {
      if (event.key === "ArrowDown" && options.length) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="csWrap">
      <div className="csField">
        <input
          name={name}
          value={value}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && active >= 0 ? `${listId}-${active}` : undefined
          }
          onChange={(event) => {
            onChange(event);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />

        {showList ? (
          <ul className="csList" id={listId} role="listbox">
            {items.length ? (
              <li className="csHeading">Бүртгэлтэй байгууллагууд</li>
            ) : null}
            {options.map((option, index) => (
              <li
                key={option.org ? option.org.id : "add"}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={`csOption${index === active ? " active" : ""}${option.add ? " add" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                {option.org ? (
                  <>
                    <span className="csLogo">
                      {option.org.logo_url ? (
                        <img src={getImageSrc(option.org.logo_url)} alt="" />
                      ) : (
                        option.org.name.trim().charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="csName">{option.org.name}</span>
                    {option.org.verified ? (
                      <FiCheckCircle
                        className="csVerified"
                        title="Баталгаажсан"
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="csLogo add">
                      <FiPlus />
                    </span>
                    <span className="csName">«{query}» гэж шинээр оруулах</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {warnExact && exact ? (
        <p className="csNote">
          <FiAlertCircle />«{exact.name}» нэртэй байгууллага бүртгэлтэй байна.
          Өөр байгууллага бол үргэлжлүүлэн бүртгүүлж болно.
        </p>
      ) : null}
    </div>
  );
}
