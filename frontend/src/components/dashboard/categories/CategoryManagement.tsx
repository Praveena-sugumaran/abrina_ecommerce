import React, { useState } from 'react';
import CategoryList from './CategoryList';
import CategoryForm from './CategoryForm';

const CategoryManagement = () => {
    const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
    const [editCategory, setEditCategory] = useState<any | null>(null);
    const [presetParentId, setPresetParentId] = useState<string | null>(null);

    const handleAdd = (parentId: string | null | undefined = null) => {
        setPresetParentId(parentId as any);
        setEditCategory(null);
        setView('add');
    };

    const handleEdit = (category: any) => {
        setEditCategory(category);
        setView('edit');
    };

    const handleSaved = () => {
        setView('list');
        setEditCategory(null);
    };

    const handleCancel = () => {
        setView('list');
        setEditCategory(null);
    };

    if (view === 'add') {
        return <CategoryForm category={null} presetParentId={presetParentId} onSave={handleSaved} onCancel={handleCancel} />;
    }

    if (view === 'edit') {
        return <CategoryForm category={editCategory} onSave={handleSaved} onCancel={handleCancel} />;
    }

    return (
        <CategoryList onAdd={handleAdd} onEdit={handleEdit} />
    );
};

export default CategoryManagement;
