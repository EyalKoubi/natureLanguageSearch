import { useEffect, useState } from "react";
import { Product } from "./types/Product";
import axios from "axios";
import "./styles/App.css";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [nbPages, setNbPages] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPage = async (q: string, pageNum: number) => {
    setLoading(true);
    try {
      const { data } = await axios.get("https://naturelanguagesearch-server.onrender.com/api/products", {
        params: { q, page: pageNum, limit: 20 },
      });
      setProducts(data.hits);
      setPage(data.page);
      setNbPages(data.nbPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage("", 0);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPage(query, 0);
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="app-container">
      <h1 className="page-title">📦 קטלוג מוצרים</h1>
      <input
        placeholder="חיפוש חופשי"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "80%",
          padding: "12px 16px",
          fontSize: "1rem",
          borderRadius: "10px",
          border: "1px solid #ccc",
          outline: "none",
          marginBottom: "2rem",
          transition: "border-color 0.3s ease",
          textAlign: "right",
          direction: "rtl",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#007bff")}
        onBlur={(e) => (e.target.style.borderColor = "#ccc")}
      />

      {loading && <p>⏳ Loading...</p>}
      <div className="products-grid">
        {products.map((p) => (
          <div className="product-card" key={p.objectID}>
            <img src={p.image} alt={p.title} />
            <h2>{p.title}</h2>
            <p>₪{p.price}</p>
          </div>
        ))}
      </div>
      <div className="pagination-buttons">
        <button disabled={page <= 0} onClick={() => fetchPage(query, page - 1)}>
          Previous
        </button>
        <span style={{ margin: "0 1rem", fontSize: "1.2rem" }}>
          Page {page + 1} of {nbPages}
        </span>
        <button
          disabled={page + 1 >= nbPages}
          onClick={() => fetchPage(query, page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default App;
