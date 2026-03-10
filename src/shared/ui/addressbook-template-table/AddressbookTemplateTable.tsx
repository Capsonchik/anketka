import styles from './AddressbookTemplateTable.module.css'

export function AddressbookTemplateTable () {
  const rows = [
    { code: '000123', name: 'ПОДРУЖКА', address: 'ул. Ленина, 10', region: 'МО', city: 'Москва' },
    { code: '000124', name: 'ПОДРУЖКА', address: 'ул. Мира, 5', region: 'МО', city: 'Москва' },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>code</th>
              <th className={styles.th}>name</th>
              <th className={styles.th}>address</th>
              <th className={styles.th}>region</th>
              <th className={styles.th}>city</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td className={`${styles.td} ${styles.code}`.trim()}>{r.code}</td>
                <td className={styles.td}>{r.name}</td>
                <td className={styles.td}>{r.address}</td>
                <td className={styles.td}>{r.region}</td>
                <td className={styles.td}>{r.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

