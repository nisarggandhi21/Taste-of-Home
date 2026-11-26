import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ALLERGENS, DIETS } from '../../constants/food';
import { useAiEnabled } from '../../hooks/useAiEnabled';
import { INITIAL_STATE, itemReducer } from '../../reducers/itemReducer';
import { aiService } from '../../services/aiService';
import { itemService } from '../../services/itemService';
import upload from '../../utils/upload';
import './Add.scss';

// Used for both "Add New Item" (/add) and "Edit Item" (/edit/:id).
const Add = () => {
  const { id } = useParams();
  const isEdit = !!id;

  const [singleFile, setSingleFile] = useState(undefined);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const aiEnabled = useAiEnabled();
  const [drafting, setDrafting] = useState(false);
  const [drafted, setDrafted] = useState(false);

  const [state, dispatch] = useReducer(itemReducer, INITIAL_STATE);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemService.getSingleItem(id),
    enabled: isEdit,
  });

  // Fill the form once the item to edit has loaded.
  useEffect(() => {
    if (existing) dispatch({ type: 'LOAD', payload: existing });
  }, [existing]);

  const handleChange = (e) => {
    dispatch({
      type: 'CHANGE_INPUT',
      payload: { name: e.target.name, value: e.target.value },
    });
  };

  const handleFeature = (e) => {
    e.preventDefault();
    if (!e.target[0].value.trim()) return;
    dispatch({
      type: 'ADD_FEATURE',
      payload: e.target[0].value,
    });
    e.target[0].value = '';
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      // When editing, a picture that is not replaced keeps its current image.
      const cover = singleFile ? await upload(singleFile) : state.cover;
      const images =
        files.length > 0 ? await Promise.all([...files].map((file) => upload(file))) : state.images;
      dispatch({ type: 'ADD_IMAGES', payload: { cover, images } });
    } catch (err) {
      console.log(err);
    } finally {
      setUploading(false);
    }
  };

  // Asks the AI helper to draft the listing from the uploaded cover photo.
  const handleDraft = async () => {
    setDrafting(true);
    try {
      const draft = await aiService.draftListing(state.cover);
      dispatch({ type: 'APPLY_DRAFT', payload: draft });
      setDrafted(true);
    } catch {
      // The request interceptor already shows the error.
    } finally {
      setDrafting(false);
    }
  };

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (item) =>
      isEdit ? itemService.updateItem(id, item) : itemService.createItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      navigate('/myitems');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Inputs hold strings; the API expects numbers for these two fields.
    mutation.mutate({
      ...state,
      price: Number(state.price),
      deliveryTime: Number(state.deliveryTime),
    });
  };

  if (isEdit && isLoading) return <div className="add">loading</div>;

  return (
    <div className="add">
      <div className="container">
        <h1>{isEdit ? 'Edit Item' : 'Add New Item'}</h1>
        <div className="sections">
          <div className="info">
            <label htmlFor="">Title</label>
            <input
              type="text"
              name="title"
              placeholder="Enter Food Title"
              value={state.title}
              onChange={handleChange}
            />
            <label htmlFor="">Category</label>
            <select name="cat" id="cat" value={state.cat} onChange={handleChange}>
              <option value="">Select any Category</option>
              <option value="north">North</option>
              <option value="south">South</option>
              <option value="pizza">Pizza</option>
              <option value="burger">Burger</option>
              <option value="cake">Cake</option>
              <option value="icecream">Ice Cream</option>
              <option value="sandwich">Sandwich</option>
              <option value="drinks">Drinks</option>
              <option value="chocolates">Chocolates</option>
            </select>
            <div className="images">
              <div className="imagesInputs">
                <label htmlFor="">Cover Image</label>
                <input type="file" onChange={(e) => setSingleFile(e.target.files[0])} />
                <label htmlFor="">Upload Images</label>
                <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
              </div>
              <button onClick={handleUpload}>{uploading ? 'uploading' : 'Upload'}</button>
            </div>
            {state.cover && <img className="coverPreview" src={state.cover} alt="Current cover" />}
            {aiEnabled && state.cover && (
              <div className="aiDraft">
                <button type="button" onClick={handleDraft} disabled={drafting}>
                  {drafting ? 'Looking at your photo…' : '✨ Fill in from photo'}
                </button>
                <span>
                  {drafted
                    ? 'Drafted by AI from your photo. Check every field before saving, especially diet and allergens.'
                    : 'Let AI draft the title, description, diet and allergens from your cover photo.'}
                </span>
              </div>
            )}
            <label htmlFor="">Description</label>
            <textarea
              name="desc"
              id=""
              placeholder="Enter Food Description"
              cols="0"
              rows="16"
              value={state.desc}
              onChange={handleChange}
            ></textarea>
            <button onClick={handleSubmit} disabled={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
          <div className="details">
            <label htmlFor="">Short Title</label>
            <input
              type="text"
              name="shortTitle"
              placeholder="short title"
              value={state.shortTitle}
              onChange={handleChange}
            />
            <label htmlFor="">Short Description</label>
            <textarea
              name="shortDesc"
              onChange={handleChange}
              id=""
              placeholder="Short description of your food"
              cols="30"
              rows="10"
              value={state.shortDesc}
            ></textarea>
            <label htmlFor="">Delivery Time (e.g. 3 hours)</label>
            <input
              type="number"
              name="deliveryTime"
              value={state.deliveryTime || ''}
              onChange={handleChange}
            />
            <label htmlFor="diet">Diet</label>
            <select name="diet" id="diet" value={state.diet} onChange={handleChange}>
              <option value="">Select veg, egg or non-veg</option>
              {DIETS.map((diet) => (
                <option key={diet.value} value={diet.value}>
                  {diet.label}
                </option>
              ))}
            </select>
            <label htmlFor="">Contains (tick every allergen in this item)</label>
            <div className="allergens">
              {ALLERGENS.map((allergen) => (
                <label key={allergen.value}>
                  <input
                    type="checkbox"
                    checked={state.allergens.includes(allergen.value)}
                    onChange={() => dispatch({ type: 'TOGGLE_ALLERGEN', payload: allergen.value })}
                  />
                  {allergen.label}
                </label>
              ))}
            </div>
            <label htmlFor="">Add Features</label>
            <form action="" className="add" onSubmit={handleFeature}>
              <input type="text" placeholder="features " />
              <button type="submit">add</button>
            </form>
            <div className="addedFeatures">
              {state?.features?.map((f) => (
                <div className="item" key={f}>
                  <button onClick={() => dispatch({ type: 'REMOVE_FEATURE', payload: f })}>
                    {f}
                    <span>X</span>
                  </button>
                </div>
              ))}
            </div>
            <label htmlFor="">Price</label>
            <input type="number" onChange={handleChange} name="price" value={state.price || ''} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Add;
