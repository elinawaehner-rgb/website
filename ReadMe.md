
# Monatliche Ausgaben eines Studierenden

## Beschreibung

Die zugehörige CSV-Datei enthält eine tabellarische Übersicht über die monatlichen Ausgaben eines Studierenden.

Jede Zeile stellt eine einzelne Transaktion dar.

## Spaltenübersicht

Die CSV-Datei enthält die folgenden Spalten in dieser Reihenfolge:

| CSV-Spaltenname | Beschreibung |
|---|---|
| Date | Datum der Transaktion im Format TT.MM.JJJJ |
| Transaction ID | Eindeutige Kennung der Transaktion |
| Amount | Höhe der Ausgabe; Dezimalstellen werden mit Komma geschrieben |
| Currency | Währung der Transaktion, in den vorliegenden Daten EUR |
| Recipient | Empfänger der Zahlung |
| Purpose | Verwendungszweck, z. B. Miete, Lebensmittel oder Fahrtkosten |

## Dateiformat

- Dateityp: CSV
- Trennzeichen: Semikolon
- Struktur: Tabellarische Daten mit sechs Spalten
- Erste Zeile: Spaltenüberschriften
- Weitere Zeilen: Einzelne Transaktionen
- Zeitraum der vorliegenden Daten: 01.04.2026 bis 30.06.2026 (37 Transaktionen)

## Verwendung

Die Daten ermöglichen eine Übersicht über die Ausgaben eines Studierenden und können für analytische Auswertungen und Kategorisierung von Ausgaben verwendet werden. Die statische Webseite besteht aus `index.html` (Struktur), `styles.css` (Design) und `app.js` (Darstellung und Filterlogik). `app.js` lädt die Transaktionen direkt aus dieser CSV-Datei. Dort lassen sich Transaktionen nach Monat und automatisch aus Empfänger und Verwendungszweck abgeleiteter Ausgabenart filtern und sortieren. Eine Auswertung weist die Summen je Ausgabenart für jeden Monat und für die gesamte Periode aus.

## Webseite lokal starten

Da die Seite die CSV per `fetch` lädt, muss sie über einen lokalen Webserver geöffnet werden und funktioniert nicht zuverlässig per Doppelklick auf `index.html`.

1. Im Projektordner ein Terminal öffnen.
2. Einen lokalen Server starten, zum Beispiel mit Python:

   ```sh
   python3 -m http.server 8000
   ```

3. Im Browser `http://localhost:8000` öffnen.

Die CSV-Datei muss im selben Ordner wie `index.html`, `styles.css` und `app.js` liegen.
