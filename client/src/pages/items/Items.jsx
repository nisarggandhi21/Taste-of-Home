import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import ItemCard from '../../components/itemCard/ItemCard';
import { ALLERGENS, DIETS, SORTS } from '../../constants/food';
import { itemService } from '../../services/itemService';
import './Items.scss';

const PAGE_SIZE = 12;
const NO_FILTERS = { min: '', max: '', location: '', diet: '', freeFrom: [] };

function Items() {
  // Category and search text come from the URL (navbar, home page search).
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const cat = params.get('cat') || '';
  const text = params.get('search') || '';

  const [filters, setFilters] = useState(NO_FILTERS);
  // Typed values only take effect on "Apply", so the list does not reload on every keystroke.
  const [typed, setTyped] = useState({ min: '', max: '', location: '' });
  // null until the buyer picks an order: searches then start by best match, browsing by
  // best selling.
  const [chosenSort, setSort] = useState(null);
  const sort = chosenSort || (text ? 'relevance' : 'sales');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const query = {
    cat,
    search: text,
    min: filters.min,
    max: filters.max,
    location: filters.location,
    diet: filters.diet,
    freeFrom: filters.freeFrom.join(','),
    sort,
    page,
    limit: PAGE_SIZE,
  };

  const { isLoading, error, data } = useQuery({
    queryKey: ['items', query],
    queryFn: () => itemService.getItems(query),
    // Keep the current cards on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
  });

  const update = (changes) => {
    setFilters((prev) => ({ ...prev, ...changes }));
    setPage(1);
  };

  const applyTyped = (e) => {
    e.preventDefault();
    update({ ...typed, location: typed.location.trim() });
  };

  const toggleAllergen = (value) => {
    update({
      freeFrom: filters.freeFrom.includes(value)
        ? filters.freeFrom.filter((allergen) => allergen !== value)
        : [...filters.freeFrom, value],
    });
  };

  const clear = () => {
    setFilters(NO_FILTERS);
    setTyped({ min: '', max: '', location: '' });
    setPage(1);
  };

  const isFiltered =
    filters.min || filters.max || filters.location || filters.diet || filters.freeFrom.length > 0;

  return (
    <div className="items">
      <Helmet>
        <title>
          {cat
            ? `Authentic ${cat.charAt(0).toUpperCase() + cat.slice(1)} | Taste of Home`
            : 'Explore Homemade Delights | Taste of Home'}
        </title>
        <meta
          name="description"
          content={
            cat
              ? `Browse and order the best homemade ${cat} prepared by expert home cooks.`
              : 'Explore a wide variety of authentic homemade dishes from local home cooks.'
          }
        />
      </Helmet>
      <div className="container">
        <p>
          {text ? `Results for “${text}”` : 'Explore the Food'}
          {text && data?.smart && (
            <span className="smart" title="Matches by meaning as well as by words">
              Smart search
            </span>
          )}
        </p>

        <div className="filters">
          <form className="group" onSubmit={applyTyped}>
            <label htmlFor="min">Budget</label>
            <input
              id="min"
              type="number"
              min="0"
              placeholder="min"
              value={typed.min}
              onChange={(e) => setTyped({ ...typed, min: e.target.value })}
            />
            <input
              type="number"
              min="0"
              placeholder="max"
              aria-label="Maximum price"
              value={typed.max}
              onChange={(e) => setTyped({ ...typed, max: e.target.value })}
            />
            <label htmlFor="location">City</label>
            <input
              id="location"
              type="text"
              placeholder="e.g. Mumbai"
              value={typed.location}
              onChange={(e) => setTyped({ ...typed, location: e.target.value })}
            />
            <button type="submit">Apply</button>
          </form>

          <div className="group">
            <label htmlFor="diet">Diet</label>
            <select
              id="diet"
              value={filters.diet}
              onChange={(e) => update({ diet: e.target.value })}
            >
              <option value="">Any</option>
              {DIETS.map((diet) => (
                <option key={diet.value} value={diet.value}>
                  {diet.label}
                </option>
              ))}
            </select>

            <label htmlFor="sort">Sort by</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              {text && <option value="relevance">Best match</option>}
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="freeFrom">
          <span>Free from</span>
          {ALLERGENS.map((allergen) => (
            <label
              key={allergen.value}
              className={filters.freeFrom.includes(allergen.value) ? 'chip active' : 'chip'}
            >
              <input
                type="checkbox"
                checked={filters.freeFrom.includes(allergen.value)}
                onChange={() => toggleAllergen(allergen.value)}
              />
              {allergen.label}
            </label>
          ))}
          {isFiltered && (
            <button type="button" className="clear" onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
        {filters.freeFrom.length > 0 && (
          <p className="hint">
            Showing only items whose cook has declared their allergens. Always confirm with the cook
            if you have an allergy.
          </p>
        )}

        {isLoading ? (
          'loading'
        ) : error ? (
          'Something went wrong!'
        ) : (
          <>
            <p className="count">
              {data.total} {data.total === 1 ? 'item' : 'items'}
            </p>
            {data.items.length === 0 ? (
              <p className="empty">No items match these filters.</p>
            ) : (
              <div className="cards">
                {data.items.map((item) => (
                  <ItemCard key={item._id} item={item} />
                ))}
              </div>
            )}
            {data.pages > 1 && (
              <div className="pager">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span>
                  Page {data.page} of {data.pages}
                </span>
                <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Items;
